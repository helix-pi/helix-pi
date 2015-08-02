/* globals it, describe */

const calculateScenarioImportances = require('../app/calculate-scenario-importance.js');

const scenario = require('./fixtures/scenario')();
const scenarioId = scenario.id;

const assert = require('assert');



describe('createScenarioImportances', () => {
  it('returns a object [scenario][participant] with a multiplier for how important it is to value diveristy in that scenario', () => {
  const individual = [];

    const fitnessesForScenario = new Map();
    fitnessesForScenario.set(individual, [500]);

    const fitnesses = new Map();
    fitnesses.set(scenario, {
      Nick: fitnessesForScenario
    });

    const scenarioImportances = calculateScenarioImportances(['Nick'], fitnesses);

    assert.deepEqual(scenarioImportances, {
      Nick: {
        0: 2
      }
    });
  });
});

