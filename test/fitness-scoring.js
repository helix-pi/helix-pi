const {scoreScenarios, boilDownIndividualScore} = require('../app/fitness-scoring.js');

const assert = require('assert');

const scenarioId = 1;

describe('scoreScenario', () => {
  it('assigns fitness scores for individuals', () => {
    const scenarios = [
      {
        id: scenarioId,
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
      }
    ];

    const individual = [
      (entity, api) => api.setVelocity(entity, {x: 10, y: 0})
    ];

    const individuals = {
      Nick: [individual]
    };

    const fitnesses = scoreScenarios(scenarios, individuals);

    assert.equal(fitnesses[scenarioId].Nick[individual].length, 1);
    assert.equal(typeof fitnesses[scenarioId].Nick[individual].length, 'number');
  });

  it('has a bug lol', () => {
    const scenarios = [
      {
        id: scenarioId,
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
      }
    ];

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

    const fitnesses = scoreScenarios(scenarios, individuals);

    assert.equal(typeof boilDownIndividualScore(individual, 'Nick', fitnesses), 'number');
    assert(boilDownIndividualScore(individual, 'Nick', fitnesses) != 0, 'Boiled down score was 90');

    assert(
      fitnesses[scenarioId].Nick[individual][0] !==
      fitnesses[scenarioId].Nick[individual2][0],
      `Both individuals had a fitness of ${fitnesses[scenarioId].Nick[individual2][0]}`
    );
  });
});

