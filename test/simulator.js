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

    const entity = new Entity(individual, {x: 0, y: 0}, [], true);

    simulateWorld([entity], 10, []);

    assert.equal(entity.x, 0);

    const entity2 = new Entity(individual, {x: 0, y: 0}, [], true);

    simulateWorld([entity], 10, [{key: 'right', startFrame: 0, endFrame: 10}]);

    assert.equal(entity.x, 9);
  });

  it('simulates collision', () => {
    var hasCollided = false;

    var individual = [
      (function (entity, api, currentFrame) {
        api.setVelocity({x: 10, y: 0});
        if (api.checkCollision(entity, currentFrame)) {
          hasCollided = true;
        }
      })
    ];

    var entity = new Entity(individual, {x: 0, y: 0}, [], true);
    var entityToCollideAgainst = new Entity([], {x: 80, y: 0}, [], false);

    simulateWorld([entity, entityToCollideAgainst], 10, []);

    assert(hasCollided);
  });

  it('applies force', () => {
    var individual = [
      (function (entity, api, currentFrame) {
        api.applyForce(entity, {x: 1, y: 0});
      })
    ];

    var entity = new Entity(individual, {x: 0, y: 0}, [], true);

    simulateWorld([entity], 5, []);

    assert.equal(entity.x, 15);
  });
});
