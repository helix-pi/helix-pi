require('babel/register');

const MUTATION_RATE = 0.15

const breedFittestIndividuals = require('./app/breeding');
const Seeder = require('./app/seeder');
const createApi = require('./app/api');
const mutated = require('./app/mutation');
const {serialize, deserialize} = require('./app/serializer');
const {
  scoreScenarios,
  boilDownIndividualScore
} = require('./app/fitness-scoring');

const reduceIntoObject = require('./app/reduce-into-object');

const calculateScenarioImportances = require('./app/calculate-scenario-importance');

const _ = require('lodash');

function arrayToObject (array) {
  return reduceIntoObject(array.map((value, key) => ({[key]: value})));
}

function fillInIndividuals (individuals, population, participants) {
  function createStub () { return function stub () { throw 'you no execute me'; }; }

  const stubApi = createApi({
    checkCollision: createStub(),
    checkButtonDown: createStub(),
    checkButtonReleased: createStub()
  });

  participants.forEach(participant => {
    let existing = individuals[participant];

    if (existing === undefined) {
      individuals[participant] = existing = [];
    }

    const numberOfIndividualsToBreed = population - existing.length;
    const newIndividuals = Seeder.make(stubApi, numberOfIndividualsToBreed);

    individuals[participant] = existing.concat(newIndividuals);
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
    return {
      [participant]: arrayToObject(_.range(scenarios.length).map(_ => 1))
    };
  }));

  _.times(generations, generation => {
    fillInIndividuals(individuals, population, participants);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
    });

    const fitnesses = scoreScenarios(scenarios, individuals);

    _.each(individuals, (individualsForParticipant, participant) => {
      individualsForParticipant.forEach(individual => {
        individual.fitness = boilDownIndividualScore(
          individual,
          participant,
          fitnesses,
          scenarioImportances
        );
      });
    });

    scenarioImportances = calculateScenarioImportances(participants, fitnesses);
    // TODO _ fittestIndividualsOfAllTime is an OUT variable, make this design better
    individuals = breedFittestIndividuals(
      individuals,
      population,
      fittestIndividualsOfAllTime // OUT
    );

    _.each(individuals, (individualsForParticipant, participant) => {
      individuals[participant] = individualsForParticipant.map(individual => {
        if (Math.random() > MUTATION_RATE) {
          return mutated(individual);
        }

        return individual;
      })
    });
  });

  return fittestIndividualsOfAllTime;
}

run.createApi = createApi; // TODO - something better than this surely
run.serialize = serialize;
run.deserialize = deserialize;

module.exports = run;
