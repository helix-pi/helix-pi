/* globals describe, it */

const addGene = require('../../app/mutations/add-gene');
const Seeder = require('../../app/seeder');
const api = require('../fixtures/api');

const assert = require('assert');

describe('addGene', () => {
  it('adds a gene to the individual', () => {
    const individual = Seeder.make(api(), 1)[0];

    const mutatedIndividual = addGene(individual);

    assert.notDeepEqual(
      individual,
      mutatedIndividual
    );

    assert.equal(mutatedIndividual.length, individual.length + 1);
  });
});
