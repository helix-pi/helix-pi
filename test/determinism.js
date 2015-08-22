/* globals describe, it */

const Seeder = require('../app/seeder');
const createApi = require('../app/api');
const simulateWorld = require('../app/simulator');
const Entity = require('../app/entity');
const prettyPrint = require('../app/pretty-print');

const _ = require('lodash');
const assert = require('assert');

function createStub () { return function stub () { throw 'you no execute me'; }; }

describe('determinism', () => {
  it('individuals do the same thing if run multiple times', () => {
    var stubApi = createApi({
      checkCollision: createStub(),
      checkButtonDown: createStub(),
      checkButtonReleased: createStub()
    });

    _.times(10, () => {
      const individual = Seeder.make(stubApi, 1)[0];

      const attempt1 = new Entity(individual, {x: 0, y: 0}, [], true);

      simulateWorld([attempt1], 3);

      const attempt2 = new Entity(individual, {x: 0, y: 0}, [], true);

      simulateWorld([attempt2], 3);

      assert.deepEqual({x: attempt1.x, y: attempt1.y}, {x: attempt2.x, y: attempt2.y},
        prettyPrint(individual)
      );
    });
  });
});
