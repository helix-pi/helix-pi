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
  var fittestEntities = [];

  var compiledApi = entityApi(new Entity([], {x: 100, y: 100}), function () {}); // TODO - fix this hack

  var individuals = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, []];
  }).object().value();

  var fitnesses = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, {}];
  }).object().value();

  _.times(generations, generation => {
    fillInIndividuals(compiledApi, individuals);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
      scoreScenario(scenario, fitnesses)
    });

    _.each(individuals, (individualsForParticipant, participant) => {
      individualsForParticipant.forEach(individual => {
        boilDownIndividualScore(individual, participant, fitnesses);
      });
    });

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

      /* Magic splicing~~~ TODO: Add tweened individuals to all of this */
      var initial = scenario.startPosition(participant);
      var entities = [new Entity(individual, initial)]

      var expectedPositions = scenario.expectedPositions[participant];

      expectedPositions.forEach(expectedPosition => {
        var frameCount = expectedPosition.frame - currentFrame;

        simulateWorld(entities, frameCount, entityApi, scenario.input, currentFrame);

        currentFrame = expectedPosition.frame;
        var evaluatedFitness = fitnessScenarios.fitness(expectedPosition, entities[0])

        fitnesses[participant][individual][scenario.id].push(evaluatedFitness);
      });
    }

    function weightedAverage (scoresPerScenario) {
      return _.sum(scoresPerScenario.map(score => Math.pow(score, 1)));
    }

    function boilDownIndividualScore (individual, participant, fitnesses) {
      return weightedAverage(
        Object.values(fitnesses[participant][individual]).map(scoresForScenario => _.sum(scoresForScenario))
      );
    }
  });

  return fittestEntities;
}

module.exports = run;
