const {createScenarioImportances} = require('../app/fitness-scoring.js');

const assert = require('assert');

const scenarioId = 1;

describe('createScenarioImportances', () => {
  it('returns a object [scenario][participant] with a multiplier for how important it is to value diveristy in that scenario', () => {
    const fitnessForParticipantPerScenario = {
      Nick: {
        0: 800,
        1: 500
      }
    }

    const scenarioImportances = createScenarioImportances(fitnessForParticipantPerScenario);

    assert.deepEqual(scenarioImportances, {
      Nick: {
        0: 1.25,
        1: 2
      }
    });
  });
});

