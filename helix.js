require("babel/register");
var Seeder = require('./app/seeder');
var Entity = require('./app/entity');
var simulateWorld = require('./app/simulator');

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
  var initialGeneration = Seeder.make(30);
  var framesToSimulate = 60;


  var entities = initialGeneration.map(individual => new Entity(individual, fitnessScenario.startingPosition()));

  entities.forEach(entity => simulateWorld(entity, fitnessScenario.duration));

  return entities.map(function (entity) {
    return {
      entity: entity,
      fitness: fitnessScenario.fitness(entity),
    };
  });
}

module.exports = run;
