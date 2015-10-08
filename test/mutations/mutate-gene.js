/* globals describe, it */

const mutateGene = require('../../app/mutations/mutate-gene');
const Seeder = require('../../app/seeder');
const api = require('../fixtures/api');

const assert = require('assert');

describe('mutateGene', () => {
  it('changes one gene in the individual', () => {
    const individual = Seeder.make(api(), 1)[0];

    const mutatedIndividual = mutateGene(individual);

    assert.notDeepEqual(
      individual,
      mutatedIndividual
    );
  });
});

