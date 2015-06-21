var simulateWorld = require("../app/simulator");
var Entity = require("../app/entity");
var assert = require("assert");

describe('simulateWorld', () => {
  it('simulates an individual', () => {
    var individual = [
      (function (api) {
        api.setVelocity({x: 1, y: 0});
      })
    ];

    var api = function(entity) {
      return {
        setVelocity (velocity) {
          entity.velocity = velocity;
        },

        update () {
          entity.x += entity.velocity.x;
          entity.y += entity.velocity.y;
        }
      };
    };

    var entity = new Entity(individual, {x: 0, y: 0});

    simulateWorld([entity], 10, api, []);

    assert.equal(entity.x, 10);
  });
});
