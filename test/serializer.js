const {serialize, deserialize} = require('../app/serializer');
const Seeder = require('../app/seeder');
const createApi = require('../app/api');
const simulateWorld = require('../app/simulator');
const Entity = require('../app/entity');

const assert = require('assert');

function createStub () { return function stub () { throw 'you no execute me'; }; };

describe("serialization", () => {
  it("serializes and deserializes", () => {
    var stubApi = createApi({
      checkCollision: createStub(),
      checkButtonDown: createStub(),
      checkButtonReleased: createStub()
    });

    const individual = Seeder.make(stubApi, 1)[0];

    const serializedIndividual = serialize(individual);
    const deserializedIndividual = deserialize(serializedIndividual);

    assert.equal(deserialize(serializedIndividual).length, individual.length);
    assert.equal(typeof deserialize(serializedIndividual)[0], "function");

    simulateWorld([new Entity(deserializedIndividual, {x: 0, y: 0}, [], true)], 10, []);
  });
});
