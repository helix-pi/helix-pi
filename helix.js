var breed = require('./app/breeding');
var Seeder = require('./app/seeder');
var Entity = require('./app/entity');
var simulateWorld = require('./app/simulator');

var _ = require('lodash');

var eachSlice = function (array, sizeOfSlice) {
  return _.chain(array).groupBy((item, index) => {
    return Math.floor(index / sizeOfSlice);
  }).toArray().value();
};

var mean = function (array) {
  return _.sum(array) / array.length;
};

function run (fitnessScenarios, entityApi, generations=500, population=32, newbornIndividuals = []) {
  var scenarios = fitnessScenarios.scenarios;
  var entities;
  var fittestIndividuals = [];

  var compiledApi = entityApi(new Entity([], {x: 100, y: 100}), function () {}); // TODO - fix this hack

  var individuals = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, []];
  }).object().value();

  var fitnesses = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, {}];
  }).object().value();

  var fittestIndividualsOfAllTime = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, []];
  }).object().value();

  function scoreScenario(scenario, fitnesses) {
    scenario.participants.forEach(participant => { scoreParticipantOnScenario(scenario, participant, fitnesses) });
  }

  function scoreParticipantOnScenario(scenario, participant, fitnesses) {
    individuals[participant].forEach(individual => { scoreIndividualOnScenario(scenario, participant, individual, fitnesses) });
  }

  function fillInIndividuals(compiledApi, individuals) {
    fitnessScenarios.participants.forEach(participant => {
      var existing = individuals[participant];
      if (existing === undefined) {
        individuals[participant] = existing = [];
      };

      individuals[participant] = existing.concat(Seeder.make(compiledApi, population - existing.length));
    });
  }

  function scoreIndividualOnScenario(scenario, participant, individual, fitnesses) {
    // This is where we call up a variant on the original simulation code
    // Note that exactly one participant is allowed to vary at each point
    var currentFrame = 0;

    if (fitnesses[participant][individual] === undefined) {
      fitnesses[participant][individual] = {};
    };

    fitnesses[participant][individual][scenario.id] = [];

    var entities = scenario.participants.map(participantForEntity => {
      var initial = scenario.startPosition(participantForEntity);
      var expectedPositions = scenario.expectedPositions[participantForEntity] || [];

      if (participantForEntity === participant) {
        return new Entity(individual, initial, expectedPositions, true);
      } else {
        return new Entity([], initial, expectedPositions, false);
      }
    });

    scenario.expectedPositions[participant].forEach(expectedPosition => {
      var frameCount = expectedPosition.frame - currentFrame;

      simulateWorld(entities, frameCount, entityApi, scenario.input, currentFrame);

      currentFrame = expectedPosition.frame;
      var evaluatedFitness = fitnessScenarios.fitness(expectedPosition, entities[0])

      fitnesses[participant][individual][scenario.id].push(evaluatedFitness);
    });
  }

  function limitTo(limit, number) {
    return _.max([limit, number]);
  }

  function weightedAverage (scoresPerScenario) {
    return _.sum(scoresPerScenario.map(score => Math.pow(limitTo(0, score), 2)));
  }

  function boilDownIndividualScore (individual, participant, fitnesses) {
    return weightedAverage(
      _.values(fitnesses[participant][individual])
        .map(scoresForScenario => weightedAverage(scoresForScenario))
    );
  }

  function breedFittestIndividuals (individuals) {
    return _.chain(individuals)
      .map((individuals, participant) => {
        return [participant, breedFittestIndividualsForParticipant(participant, individuals)]})
      .object()
      .value();
  }

  function breedFittestIndividualsForParticipant (participant, individuals) {
    var fittestIndividuals = individuals
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, Math.ceil(population / 2));

    fittestIndividualsOfAllTime[participant] = fittestIndividualsOfAllTime[participant]
      .concat(fittestIndividuals)
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, Math.ceil(population / 2));

    var breedingPairs = eachSlice(fittestIndividuals, 2);

    return _.flatten(breedingPairs.map(pair => breed.apply(this, pair)));
  }

  _.times(generations, generation => {
    fillInIndividuals(compiledApi, individuals);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
      scoreScenario(scenario, fitnesses)
    });

    _.each(individuals, (individualsForParticipant, participant) => {
      individualsForParticipant.forEach(individual => {
        individual.fitness = boilDownIndividualScore(individual, participant, fitnesses);
      });
    });

    individuals = breedFittestIndividuals(individuals);
  });

  return fittestIndividualsOfAllTime;
}

module.exports = run;
