var run = require('../helix');
var assert = require("assert");
var _ = require('lodash');

const UPDATE = 'update';
const COMMAND = 'command';
const QUERY = 'query';

var fitnessScenarios = {
  participants: ['swordsunit', 'ball'],

  scenarios: [
    {
      participants: ['swordsunit'],

      initialPositions: {
        'swordsunit': {
          x: 0,
          y: 0
        }
      },

      startPosition(name) {
        return(this.initialPositions[name]);
      },

      expectedPositions: {
        'swordsunit': [
          {
            frame: 60,
            x: 500,
            y: 0
          }
        ]
      },

      input: [
        {
          startFrame: 0,
          endFrame: 60,
          key: 'right'
        }
      ]
    },
    {
      participants: ['swordsunit'],

      initialPositions: {
        'swordsunit': {
          x: 0,
          y: 0
        }
      },

      startPosition(name) {
        return(this.initialPositions[name]);
      },

      expectedPositions: {
        'swordsunit': [
          {
            frame: 60,
            x: -500,
            y: 0
          }
        ]
      },

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

var api = function(entity, getButtonDown, checkCollision) {
  var self = {};

  function declareApiCall(name, options, f) {
    f.type = options.type;
    f.takes = options.takes;
    f.returns = options.returns;

    self[name] = f;
  }

  declareApiCall('update', {
    type: UPDATE,
    takes: null,
    returns: null
  }, function () {
    entity.x += entity.velocity.x;
    entity.y += entity.velocity.y;
  });

  declareApiCall('setVelocity', {
    type: COMMAND,
    takes: {x: 0, y: 0},
    returns: null
  }, function (velocity) {
    entity.velocity.x = velocity.x;
    entity.velocity.y = velocity.y;
  });

  declareApiCall('checkButtonDown', {
    type: QUERY,
    takes: ['right', 'left', 'up', 'down'],
    returns: [true, false]
  }, getButtonDown);

  declareApiCall('getPosition', {
    type: QUERY,
    takes: [],
    returns: {x: 0, y: 0}
  }, function () {
    return {
      x: entity.x,
      y: entity.y
    };
  });

  declareApiCall('checkCollision', {
    type: QUERY,
    takes: null,
    returns: []
  }, function (currentFrame) {
    return checkCollision(entity, currentFrame);
  });

  return self;
};


describe('Helix', () => {
  describe('#run', () => {
    var results = run(fitnessScenarios, api);

    it('returns an array of entities with fitnesses', () => {
      assert(!isNaN(results['swordsunit'][0].fitness));
    });

    it('actually has different values for the results', () => {
      var fitnesses = results['swordsunit'].map(result => result.fitness);
      assert(
        _.uniq(fitnesses).length > 1,
        `All results had the same fitness: ${fitnesses[0]}`
      );
    });

    it('is teh smats at making programs', () => {
      assert(
        results['swordsunit'][0].fitness > 750,
        `Fittest program: ${results['swordsunit'][0].fitness}. Goal: 750`
      );
    });

    it('handles input', () => {
      let inputResults = results;

      console.log(inputResults['swordsunit'][0].fitness);
      console.log(inputResults['swordsunit'][0].map(gene => String(gene)).join("\n"));

      assert(
        inputResults['swordsunit'][0].fitness > 900,
        `Handle controls better: ${inputResults['swordsunit'][0].fitness}/900`
      )
    });
  });
});
