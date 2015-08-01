var breedFittestIndividuals = require('./app/breeding');
var Seeder = require('./app/seeder');
var createApi = require('./app/api');
const {serialize, deserialize} = require('./app/serializer');
const {scoreScenarios, boilDownIndividualScore, createScenarioImportances} = require('./app/fitness-scoring');

var _ = require('lodash');

function mean (numbers) {
  const result = _.sum(numbers) / numbers.length;

  if (result === Infinity) {
    return 0;
  }

  return result;
}

function run (fitnessScenarios, generations=150, population=32, individuals = {}) {
  var scenarios = fitnessScenarios.scenarios;

  function createStub () { return function stub () { throw 'you no execute me'; }; };
  var stubApi = createApi({
    checkCollision: createStub(),
    checkButtonDown: createStub(),
    checkButtonReleased: createStub()
  });

  _.difference(Object.keys(individuals), fitnessScenarios.participants).forEach(participant => {
    individuals[participant] = [];
  });

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

  function reduceIntoObject (keyValues) {
    return keyValues
      .reduce((object, keyValue) => Object.assign(object, keyValue), {});
  };

  function arrayToObject (array) {
    return reduceIntoObject(array.map((value, key) => ({[key]: value})));
  };

  var scenarioImportances = reduceIntoObject(fitnessScenarios.participants.map(participant => {
    return {[participant]: arrayToObject(_.range(fitnessScenarios.scenarios.length).map(_ => 1))};
  }));

  _.times(generations, generation => {
    fillInIndividuals(individuals);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
    });

    const fitnesses = scoreScenarios(scenarios, individuals);

    _.each(individuals, (individualsForParticipant, participant) => {
      individualsForParticipant.forEach(individual => {
        individual.fitness = boilDownIndividualScore(individual, participant, fitnesses, scenarioImportances);

        if (isNaN(individual.fitness.score)) {
          throw new Exception('Oh noes!');
        }
      });
    });

    const highestFitnessesForScenarioForParticipant = reduceIntoObject(fitnessScenarios.participants.map(participant => {
      return {[participant]: reduceIntoObject(
        fitnesses.map((scenarioFitnesses, scenario) => {
          if (scenarioFitnesses[participant] === undefined) {
            return {[scenario.id]: 0};
          }

          return {[scenario.id]: _.max(
            scenarioFitnesses[participant].valuesArray().map(fitnesses => mean(fitnesses))
          )};
        }).valuesArray()
      )};
    }));

    scenarioImportances = createScenarioImportances(highestFitnessesForScenarioForParticipant);

    // TODO _ fittestIndividualsOfAllTime is an OUT variable, make this design better
    individuals = breedFittestIndividuals(individuals, population, fittestIndividualsOfAllTime);
  });

  return fittestIndividualsOfAllTime;
}

run.createApi = createApi; // TODO - something better than this surely
run.serialize = serialize;
run.deserialize = deserialize;

module.exports = run;
