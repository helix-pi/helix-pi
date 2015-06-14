var run = require('../helix');
var assert = require("assert");
var _ = require('lodash');

var fitnessScenarios = {
  scenarios: [
    {
      startingPosition () {
        return {
          x: 0,
          y: 0
        };
      },

      expectedPositions: [
        {
          frame: 60,
          x: 500,
          y: 0
        }
      ],

      input: [
        {
          startFrame: 0,
          endFrame: 60,
          key: 'right'
        }
      ]
    },
    {
      startingPosition () {
        return {
          x: 0,
          y: 0
        };
      },

      expectedPositions: [
        {
          frame: 60,
          x: -500,
          y: 0
        }
      ],

      input: [
        {
          startFrame: 0,
          endFrame: 60,
          key: 'left'
        }
      ]
    }
  ],

  fitness (expectedPosition, entity) {
    var distance = {
      x: Math.abs(expectedPosition.x - entity.x),
      y: Math.abs(expectedPosition.y - entity.y)
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
    var results = run(fitnessScenarios, api);

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
      let inputResults = results;

      console.log(inputResults[0].fitness);
      console.log(inputResults[0].individual.map(gene => String(gene)).join("\n"));

      assert(
        inputResults[0].fitness > 900,
        `Handle controls better: ${inputResults[0].fitness}/900`
      )
    });
  });
});
