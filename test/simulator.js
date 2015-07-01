var simulateWorld = require("../app/simulator");
var Entity = require("../app/entity");
var assert = require("assert");

describe('simulateWorld', () => {
  it('simulates an individual', () => {
    var individual = [
      (function (entity, api) {
        api.setVelocity(entity, {x: 1, y: 0});
      })
    ];

    var entity = new Entity(individual, {x: 0, y: 0}, [], true);

    simulateWorld([entity], 10, []);

    assert.equal(entity.x, 10);
  });

  it('handles input', () => {
    var individual = [
      (function (entity, api, currentFrame) {
        if (api.checkButtonDown(entity, 'right', currentFrame)) {
          api.setVelocity(entity, {x: 1, y: 0});
        }
      })
    ];

    var entity = new Entity(individual, {x: 0, y: 0}, [], true);

    simulateWorld([entity], 10, []);

    assert.equal(entity.x, 0);

    simulateWorld([entity], 10, [{key: 'right', startFrame: 0, endFrame: 10}]);

    assert.equal(entity.x, 0);
  });
});
