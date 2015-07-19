const {scoreScenario, boilDownIndividualScore} = require('../app/fitness-scoring.js');

const assert = require('assert');

describe('scoreScenario', () => {
  it('assigns fitness scores for individuals', () => {
    const scenario = {
      id: 1,
      participants: ['Nick'],

      initialPositions: {
        Nick: {x: 0, y: 0}
      },

      expectedPositions: {
        Nick: [
          {
            frame: 10,
            x: 100,
            y: 0
          }
        ]
      }
    };

    const individual = [
      (entity, api) => api.setVelocity(entity, {x: 10, y: 0})
    ];

    const individuals = {
      Nick: [individual]
    };

    const fitnesses = scoreScenario(scenario, individuals);

    assert.equal(fitnesses.Nick[individual][scenario.id].length, 1);
    assert.equal(typeof fitnesses.Nick[individual][scenario.id].length, 'number');
  });

  it('has a bug lol', () => {
    const scenario = {
      id: 1,
      participants: ['Nick'],

      initialPositions: {
        Nick: {x: 0, y: 0}
      },

      expectedPositions: {
        Nick: [
          {
            frame: 10,
            x: 100,
            y: 0
          }
        ]
      }
    };

    function makeVelocityGene (velocity) {
      return (entity, api) => api.setVelocity(entity, velocity);
    }

    const individual = [
      makeVelocityGene({x: 10, y: 0})
    ];

    const individual2 = [
      makeVelocityGene({x: -10, y: 0})
    ];

    const individuals = {
      Nick: [individual, individual2]
    };

    const fitnesses = scoreScenario(scenario, individuals);

    assert(
      fitnesses.Nick[individual][scenario.id][0] !==
      fitnesses.Nick[individual2][scenario.id][0],
    `Both individuals had a fitness of ${fitnesses.Nick[individual2][scenario.id][0]}`
    );
  });
});

