var run = require('../helix');
var assert = require("assert");

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

describe('Helix', () => {
  describe('#run', () => {
    it('returns an array of entities with fitnesses', () => {
      var results = run(fitnessScenario);
      assert(!isNaN(results[0].fitness));
    });
  });
});
