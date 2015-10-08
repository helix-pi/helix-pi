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

    const mutatedIndividual = mutateIndividual(individual, api());

    assert.notDeepEqual(
      individual,
      mutatedIndividual,
      'Mutated and normal individuals are the same'
    );
  });
});
