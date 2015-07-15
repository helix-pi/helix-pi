var run = require('../helix');
var assert = require("assert");
var _ = require('lodash');

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


describe('Helix', () => {
  describe('#run', () => {
    var results = run(fitnessScenarios, 20);

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

    it('handles input', () => {
      let inputResults = results;

      assert(
        inputResults['swordsunit'][0].fitness > 900,
        `Handle controls better: ${inputResults['swordsunit'][0].fitness}/900`
      )
    });
  });
});
