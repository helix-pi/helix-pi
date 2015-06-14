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

function run (fitnessScenarios, entityApi, generations=500, population=32) {
  var newbornIndividuals = [];
  var entities;
  var fittestEntities = [];


  var compiledApi = entityApi(new Entity([], {x: 100, y: 100}), function () {}); // TODO - fix this hack

  _.times(generations, function (generation) {
    newbornIndividuals = newbornIndividuals.concat(Seeder.make(compiledApi, population - newbornIndividuals.length));

    fitnessScenarios.scenarios.forEach(fitnessScenario => {
      entities = newbornIndividuals
        .map(individual => new Entity(individual, fitnessScenario.startingPosition()));

      var currentFrame = 0;
      fitnessScenario.expectedPositions.forEach(expectedPosition => {
        entities.forEach(entity => simulateWorld(entity, expectedPosition.frame - currentFrame, entityApi, fitnessScenario.input, currentFrame));

        currentFrame += expectedPosition.frame;

        entities.forEach(entity => {
          entity.fitnessPerPosition.push(fitnessScenarios.fitness(expectedPosition, entity));
        });
      });

      entities.forEach(entity => {
        entity.fitness = mean(entity.fitnessPerPosition);
      });

      var entitiesSortedByFitness = entities.sort((a, b) => b.fitness - a.fitness);

      var fittestIndividuals = entitiesSortedByFitness
        .map(e => e.individual)
        .slice(0, population / 2);

      fittestEntities = fittestEntities
        .concat(entitiesSortedByFitness)
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, 16);

      var breedingPairs = eachSlice(fittestIndividuals, 2);

      newbornIndividuals = _.flatten(breedingPairs.map(pair => breed.apply(this, pair)));
    });
  });

  return fittestEntities;
}

module.exports = run;
