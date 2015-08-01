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

    assert.equal(fitnesses[scenarioId].Nick.get(individual).length, 1);
    assert.equal(typeof fitnesses[scenarioId].Nick.get(individual).length, 'number');
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
      fitnesses[scenarioId].Nick.get(individual)[0] !==
      fitnesses[scenarioId].Nick.get(individual2)[0],
      `Both individuals had a fitness of ${fitnesses[scenarioId].Nick.get(individual2)[0]}`
    );
  });
});


describe('boilDownIndividualScore', () => {
  const individual = [];

  const fitnesses = {
    0: {
      Nick: new Map([
        [individual, [500]]
      ])
    }
  }

  const scenarioImportances = {
    'Nick': {0: 2}
  }

  const fitness = boilDownIndividualScore(individual, 'Nick', fitnesses, scenarioImportances);

  it('takes an individual and fitnesses and returns a fitness number', () => {
    assert.equal(typeof fitness.score, 'number', 'Expected score.score to be a number');
    assert.equal(fitness.score, 500);
  });

  it('returns a weighted fitness number as well', () => {
    assert.equal(typeof fitness.weightedScore, 'number', 'Expected score.weightedScore to be a number');
    assert.equal(fitness.weightedScore, 1000);
  });
});
