/* globals describe, it */

const mutateIndividual = require('../app/mutation');
const simulator = require('../app/simulator');
const Entity = require('../app/entity');
const Seeder = require('../app/seeder');
const api = require('./fixtures/api');

const assert = require('assert');

describe('mutation', () => {
  it('slightly changes the genetic code of an individual', () => {
    const individual = Seeder.make(api(), 1)[0];

    const normalEntity = new Entity(individual, {x: 0, y: 0}, [], true);

    simulator([normalEntity], 3, []);

    const mutatedIndividual = mutateIndividual(individual);

    const mutatedEntity = new Entity(mutatedIndividual, {x: 0, y: 0}, [], true);

    simulator([mutatedEntity], 3, []);

    function position (entity) {
      return {
        x: entity.x,
        y: entity.y
      };
    }

    assert.notDeepEqual(
      position(normalEntity),
      position(mutatedEntity),
      "Mutated and normal individuals are the same"
    );

  });
});
