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

  var individuals = {
    'swordsunit': [],
    'ball': []
  };
  _.times(generations, generation => {
    fillInIndividuals(compiledApi, individuals);

    // fitnesses :: Participant \\ Individual \\ Scenario \\ FitnessPerKeyframe
    var fitnesses = {
      'swordsunit': {},
      'ball': {}
    };

    scenarios.forEach(scenario => { scoreScenario(scenario, fitnesses) });

    function scoreScenario(scenario, fitnesses) {
      scenario.participants.forEach(participant => { scoreParticipantOnScenario(scenario, participant, fitnesses) });
    }

    function scoreParticipantOnScenario(scenario, participant, fitnesses) {
      individuals[participant].forEach(individual => { scoreIndividualOnScenario(scenario, participant, individual, fitnesses) });
    }

    function fillInIndividuals(compiledApi, individuals) {
      var keys = Object.keys(individuals);
      keys.forEach(key => {
        var existing = individuals[key];
        individuals[key].concat(Seeder.make(compiledApi, population - existing.length));
      });
    }

    function scoreIndividualOnScenario(scenario, participant, individual, fitnesses) {
      // This is where we call up a variant on the original simulation code
      // Note that exactly one participant is allowed to vary at each point
      var currentFrame = 0;
      fitnesses[participant][individual][scenario] = [];

      /* Magic splicing~~~ TODO: Add tweened individuals to all of this */
      var initial = scenario.startingPosition(participant);
      var entities = [new Entity(individual, initial)]

      var expectedPositions = scenario.expectedPositions[participant];

      expectedPositions.forEach(expectedPosition => {
        var frameCount = expectedPosition.frame - currentFrame;

        simulateWorld(entities, timeframe, entityApi, fitnessScenario.input, currentFrame);

        currentFrame = expectedPosition.frame;
        var evaluatedFitness = fitnessScenario.fitness(expectedPosition, entity)

        fitnesses[participant][individual][scenario].push(evaluatedFitness);
      });
    }
  });

  return fittestEntities;
}

module.exports = run;
