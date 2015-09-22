/* globals describe, it */

const removeGene = require('../../app/mutations/remove-gene');
const Seeder = require('../../app/seeder');
const api = require('../fixtures/api');

const assert = require('assert');

describe('removeGene', () => {
  it('switches two genes in the individual', () => {
    const individual = Seeder.make(api(), 1)[0];

    const mutatedIndividual = removeGene(individual);

    assert.notDeepEqual(
      individual,
      mutatedIndividual
    );

    assert.equal(mutatedIndividual.length, individual.length - 1);
  });
});
