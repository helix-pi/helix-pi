var breedFittestIndividuals = require('./app/breeding');
var Seeder = require('./app/seeder');
var createApi = require('./app/api');
const {serialize, deserialize} = require('./app/serializer');
const {scoreScenarios, boilDownIndividualScore} = require('./app/fitness-scoring');

var _ = require('lodash');

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

  _.times(generations, generation => {
    fillInIndividuals(individuals);

    scenarios.forEach((scenario, index) => {
      scenario.id = index;
    });

    const fitnesses = scoreScenarios(scenarios, individuals);

    _.each(individuals, (individualsForParticipant, participant) => {
      individualsForParticipant.forEach(individual => {
        individual.fitness = boilDownIndividualScore(individual, participant, fitnesses);
      });
    });

    // TODO _ fittestIndividualsOfAllTime is an OUT variable, make this design better
    individuals = breedFittestIndividuals(individuals, population, fittestIndividualsOfAllTime);
  });

  return fittestIndividualsOfAllTime;
}

run.createApi = createApi; // TODO - something better than this surely
run.serialize = serialize;
run.deserialize = deserialize;

module.exports = run;
