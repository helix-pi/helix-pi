var simulateWorld = require("../app/simulator");
var Entity = require("../app/entity");
var assert = require("assert");

describe('simulateWorld', () => {
  it('simulates an individual', () => {
    var individual = [
      (function (api) {
        api.move({x: 1, y: 0});
      })
    ];

    var entity = new Entity(individual, {x: 0, y: 0});

    simulateWorld(entity, 10);

    assert.equal(entity.position.x, 10);
  });
});
