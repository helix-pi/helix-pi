require("babel/register");

var breed = require('./app/breeding');
var Seeder = require('./app/seeder');
var Entity = require('./app/entity');
var simulateWorld = require('./app/simulator');

var _ = require('lodash');

Array.prototype.eachSlice = function (size, callback){
  for (var i = 0, l = this.length; i < l; i += size){
    callback.call(this, this.slice(i, i + size));
  }
};

var fitnessScenario = {
  startingPosition() {
    return {
      x: 100,
      y: 100,
    };
  },

  expectedEndPosition: {
    x: 200,
    y: 100,
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
   
    var breedingPairs = _.zip(
      fittestIndividuals.slice(0, 8),
      fittestIndividuals.slice(8, 16)
    );

    newbornIndividuals = _.flatten(breedingPairs.map(pair => breed(pair[0], pair[1])))
  })

  return entities.map(function (entity) {
    return {
      entity: entity,
      fitness: fitnessScenario.fitness(entity),
    };
  }).sort((a, b) => b.fitness - a.fitness);
}

module.exports = run;
