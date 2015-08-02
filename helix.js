var breedFittestIndividuals = require('./app/breeding');
var Seeder = require('./app/seeder');
var createApi = require('./app/api');
const {serialize, deserialize} = require('./app/serializer');
const {scoreScenarios, boilDownIndividualScore, createScenarioImportances} = require('./app/fitness-scoring');

var _ = require('lodash');

function reduceIntoObject (keyValues) {
  return keyValues.reduce(
    (object, keyValue) => Object.assign(object, keyValue),
    {}
  );
};

function arrayToObject (array) {
  return reduceIntoObject(array.map((value, key) => ({[key]: value})));
};

function mean (numbers) {
  const result = _.sum(numbers) / numbers.length;

  if (result === Infinity) {
    return 0;
  }

  return result;
}

function highestFitnessForScenario (fitnessesForScenario) {
  return _.max(fitnessesForScenario.valuesArray().map(fitnesses => mean(fitnesses)));
}

function highestFitnessForParticipantPerScenario (participant, fitnesses) {
  return reduceIntoObject(
    fitnesses.map((scenarioFitnesses, scenario) => {
      if (scenarioFitnesses[participant] === undefined) {
        return {[scenario.id]: 0};
      }

      return {
        [scenario.id]: highestFitnessForScenario(scenarioFitnesses[participant])
      };
    }).valuesArray()
  );
};

function getHighestFitnessesForScenarioForParticipant (participants, fitnesses) {
  return reduceIntoObject(participants.map(participant => {
    return {
      [participant]: highestFitnessForParticipantPerScenario(participant, fitnesses)
    };
  }));
};

function fillInIndividuals (individuals, population, participants) {
  function createStub () { return function stub () { throw 'you no execute me'; }; };

  var stubApi = createApi({
    checkCollision: createStub(),
    checkButtonDown: createStub(),
    checkButtonReleased: createStub()
  });

  participants.forEach(participant => {
    var existing = individuals[participant];

    if (existing === undefined) {
      individuals[participant] = existing = [];
    };

    individuals[participant] = existing.concat(Seeder.make(stubApi, population - existing.length));
  });

  return individuals;
}

function run (fitnessScenarios, generations=150, population=32, individuals = {}) {
  const scenarios = fitnessScenarios.scenarios;
  const participants = fitnessScenarios.participants;

  let fittestIndividualsOfAllTime = _.chain(participants).map(participant => {
    return [participant, []];
  }).object().value();

  let scenarioImportances = reduceIntoObject(participants.map(participant => {
    return {[participant]: arrayToObject(_.range(fitnessScenarios.scenarios.length).map(_ => 1))};
  }));

  _.times(generations, generation => {
    fillInIndividuals(individuals, population, participants);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
    });

    const fitnesses = scoreScenarios(scenarios, individuals);

    _.each(individuals, (individualsForParticipant, participant) => {
      individualsForParticipant.forEach(individual => {
        individual.fitness = boilDownIndividualScore(individual, participant, fitnesses, scenarioImportances);
      });
    });

    scenarioImportances = createScenarioImportances(
      getHighestFitnessesForScenarioForParticipant(participants, fitnesses)
    );

    // TODO _ fittestIndividualsOfAllTime is an OUT variable, make this design better
    individuals = breedFittestIndividuals(individuals, population, fittestIndividualsOfAllTime);
  });

  return fittestIndividualsOfAllTime;
}

run.createApi = createApi; // TODO - something better than this surely
run.serialize = serialize;
run.deserialize = deserialize;

module.exports = run;
