/* globals it, describe */

const {scoreScenarios, boilDownIndividualScore} = require('../app/fitness-scoring.js');

const scenario = require('./fixtures/scenario')();
const assert = require('assert');

const scenarioId = scenario.id;

const scenarios = [scenario];

describe('scoreScenario', () => {
  it('assigns fitness scores for individuals', () => {

    const individual = [
      (entity, api) => api.setVelocity(entity, {x: 10, y: 0})
    ];

    const individuals = {
      Nick: [individual]
    };

    const fitnesses = scoreScenarios(scenarios, individuals);

    assert.equal(fitnesses.get(scenario).Nick.get(individual).length, 1);
    assert.equal(typeof fitnesses.get(scenario).Nick.get(individual).length, 'number');
  });

  it('has a bug lol', () => {
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

    assert(
      fitnesses.get(scenario).Nick.get(individual)[0] !==
      fitnesses.get(scenario).Nick.get(individual2)[0],
      `Both individuals had a fitness of ${fitnesses.get(scenario).Nick.get(individual2)[0]}`
    );
  });
});

describe('boilDownIndividualScore', () => {
  const individual = [];

  const fitnessesForScenario = new Map();
  fitnessesForScenario.set(individual, [500]);

  const fitnesses = new Map();
  fitnesses.set(scenario, {
    Nick: fitnessesForScenario
  });

  const scenarioImportances = {
    'Nick': {[scenarioId]: 2}
  };

  const fitness = boilDownIndividualScore(individual, 'Nick', fitnesses, scenarioImportances);

  assert.equal(typeof fitnesses.get(scenario), 'object');

  it('takes an individual and fitnesses and returns a fitness number', () => {
    assert.equal(typeof fitness.score, 'number', 'Expected score.score to be a number');
    assert.equal(fitness.score, 500);
  });

  it('returns a weighted fitness number as well', () => {
    assert.equal(typeof fitness.weightedScore, 'number', 'Expected score.weightedScore to be a number');
    assert.equal(fitness.weightedScore, 1000);
  });
});
