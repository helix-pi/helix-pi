var run = require('../helix');
var assert = require("assert");
var _ = require('lodash');

var fitnessScenario = {
  startingPosition() {
    return {
      x: 100,
      y: 100,
    };
  },

  expectedPositions: [
    {
      frame: 60,
      x: 1000,
      y: -100,
    },
    {
      frame: 120,
      x: 1300,
      y: 1000,
    },
  ],

  fitness(expectedPosition, entity) {
    var distance = {
      x: Math.abs(expectedPosition.x - entity.x),
      y: Math.abs(expectedPosition.y - entity.y),
    };

    return 1000 - (distance.x + distance.y);
  }
};

var api = function(entity) {
  return {
    move(coordinates) {
      var oldX = entity.x;
      entity.x += coordinates.x;
      entity.y += coordinates.y;
    },

    getPosition() {
      return {
        x: entity.x,
        y: entity.y,
      }
    }

  };
};


describe('Helix', () => {
  describe('#run', () => {
    var results = run(fitnessScenario, api);

    it('returns an array of entities with fitnesses', () => {
      assert(!isNaN(results[0].fitness));
    });

    it('actually has different values for the results', () => {
      var fitnesses = results.map(result => result.fitness);
      assert(
        _.uniq(fitnesses).length > 1,
        `All results had the same fitness: ${fitnesses[0]}`
      );
    });

    it('is teh smats at making programs', () => {
      assert(
        results[0].fitness > 750,
        `Fittest program: ${results[0].fitness}. Goal: 750`
      );
    });
  });
});
