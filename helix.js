require("babel/register");

var breed = require('./app/breeding');
var Seeder = require('./app/seeder');
var Entity = require('./app/entity');
var simulateWorld = require('./app/simulator');

var _ = require('lodash');

var eachSlice = function(array, sizeOfSlice) {
  return _.chain(array).groupBy((item, index) => {
    Math.floor(index / sizeOfSlice);
  }).toArray().value();
};


var fitnessScenario = {
  startingPosition() {
    return {
      x: 100,
      y: 100,
    };
  },

  expectedEndPosition: {
    x: 1000,
    y: -100,
  },

  duration: 60,

  fitness(entity) {
    var distance = {
      x: Math.abs(this.expectedEndPosition.x - entity.position.x),
      y: Math.abs(this.expectedEndPosition.y - entity.position.y),
    }

    return 1000 - (distance.x + distance.y);
  }
};

function run(generations=100, population=32) {
  var newbornIndividuals = [];
  var entities;
 
  _.times(generations, function() {
    entities = newbornIndividuals
      .concat(Seeder.make(population - newbornIndividuals.length))
      .map(individual => new Entity(individual, fitnessScenario.startingPosition()));

    entities.forEach(entity => simulateWorld(entity, fitnessScenario.duration));

    var fitness = {};

    entities.forEach(function(entity) {
      fitness[entity.individual] = fitnessScenario.fitness(entity);
    });

    var fittestIndividuals = entities
      .map(e => e.individual)
      .sort((a, b) => fitness[b] - fitness[a])
      .slice(0, population / 2);
   
    var breedingPairs = eachSlice(fittestIndividuals, 2)
      .concat(eachSlice(_.shuffle(fittestIndividuals), 2));
    newbornIndividuals = _.flatten(breedingPairs.map(pair => breed.apply(this, pair)));
  })

  return entities.map(function (entity) {
    return {
      entity: entity,
      fitness: fitnessScenario.fitness(entity),
    };
  }).sort((a, b) => b.fitness - a.fitness);
}

module.exports = run;
