require("babel/register");
var Seeder = require('./app/seeder');

function run(generations=100, population=30) {
  var initialGeneration = Seeder.make(30);
  var framesToSimulate = 60;

  var fitnessScenario = {
    startingPosition: {
      x: 100,
      y: 100,
    },

    expectedEndPosition: {
      x: 200,
      y: 100,
    },

    duration: 60,
  };

  var entities = initialGeneration.map(individual => new Entity(individual, fitnessScenario.startingPosition));

  entities.forEach(entity => simulateWorld(entity, fitnessScenario.duration));

  entities.map(function (entity) {
    return {
      entity: entity,
      fitness: fitnessScenario.fitness(entity),
    };
  });
}

module.exports = run;
