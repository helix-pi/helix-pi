var breed = require('./app/breeding');
var Seeder = require('./app/seeder');
var createApi = require('./app/api');
const {serialize, deserialize} = require('./app/serializer');
const {scoreScenario, boilDownIndividualScore} = require('./app/fitness-scoring');

var _ = require('lodash');

var eachSlice = function (array, sizeOfSlice) {
  return _.chain(array).groupBy((item, index) => {
    return Math.floor(index / sizeOfSlice);
  }).toArray().value();
};

function run (fitnessScenarios, generations=150, population=32, individuals = {}) {
  var scenarios = fitnessScenarios.scenarios;
  var entities;
  var fittestIndividuals = [];

  function createStub () { return function stub () { throw 'you no execute me'; }; };
  var stubApi = createApi({
    checkCollision: createStub(),
    checkButtonDown: createStub(),
    checkButtonReleased: createStub()
  });

  _.difference(Object.keys(individuals), fitnessScenarios.participants).forEach(participant => {
    individuals[participant] = [];
  });

  var fitnesses = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, {}];
  }).object().value();

  var fittestIndividualsOfAllTime = _.chain(fitnessScenarios.participants).map(participant => {
    return [participant, []];
  }).object().value();

  function fillInIndividuals (individuals) {
    fitnessScenarios.participants.forEach(participant => {
      var existing = individuals[participant];
      if (existing === undefined) {
        individuals[participant] = existing = [];
      };

      individuals[participant] = existing.concat(Seeder.make(stubApi, population - existing.length));
    });
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
      .slice(0, Math.ceil(population / 4));

    var breedingPairs = eachSlice(fittestIndividuals, 2);

    return _.flatten(breedingPairs.map(pair => breed.apply(this, pair)));
  }

  _.times(generations, generation => {
    fillInIndividuals(individuals);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
      scoreScenario(scenario, fitnesses, individuals);
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

run.createApi = createApi; // TODO - something better than this surely
run.serialize = serialize;
run.deserialize = deserialize;

module.exports = run;
