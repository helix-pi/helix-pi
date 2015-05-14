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

    var api = function(entity) {
      return {
        move (coords) {
          entity.position.x += coords.x;
          entity.position.y += coords.y;
        }
      };
    };

    var entity = new Entity(individual, {x: 0, y: 0});

    simulateWorld(entity, 10, api);

    assert.equal(entity.position.x, 10);
  });
});
