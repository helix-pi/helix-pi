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

  input: [],

  fitness(expectedPosition, entity) {
    var distance = {
      x: Math.abs(expectedPosition.x - entity.x),
      y: Math.abs(expectedPosition.y - entity.y),
    };

    return 1000 - (distance.x + distance.y);
  }
};

var inputFitnessScenario = {
  startingPosition() {
    return {
      x: 100,
      y: 100,
    };
  },

  expectedPositions: [
    {
      frame: 60,
      x: 100,
      y: 100,
    },
    {
      frame: 120,
      x: 800,
      y: 100
    },
    {
      frame: 180,
      x: 800,
      y: 100
    },
    {
      frame: 240,
      x: 100,
      y: 100
    }
  ],

  input: [
    {
      startFrame: 60,
      endFrame: 120,

      key: 'right'
    },
    {
      startFrame: 180,
      endFrame: 240,

      key: 'left'
    }
  ],

  fitness(expectedPosition, entity) {
    var distance = {
      x: Math.abs(expectedPosition.x - entity.x),
      y: Math.abs(expectedPosition.y - entity.y),
    };

    return 1000 - (distance.x + distance.y);
  }
};

var api = function(entity, checkButtonDown) {
  var self = {
    move(coordinates) {
      var oldX = entity.x;
      entity.x += coordinates.x;
      entity.y += coordinates.y;
    },

  }

  function declareApiCall({takes, returns}, f) {
    f.takes = takes;
    f.returns = returns;
    return f;
  }

  self.checkButtonDown = declareApiCall({
    takes: ['right', 'left'],
    returns: [true, false]
  }, checkButtonDown);

  self.getPosition = declareApiCall({
    takes: [],
    returns: {x: 0, y: 0},
  }, () => {
    return {
      x: entity.x,
      y: entity.y
    };
  });

  return self;
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

    it('handles input', () => {
      let inputResults = run(inputFitnessScenario, api);

      console.log(inputResults[0].fitness);
      console.log(inputResults[0].individual.map(gene => String(gene)).join("\n"));

      assert(
        inputResults[0].fitness > 900,
        `Handle controls better: ${inputResults[0].fitness}/900`
      )
    });
  });
});
