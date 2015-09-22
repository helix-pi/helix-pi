/* globals describe, it */

const switchGene = require('../../app/mutations/switch-gene');
const Seeder = require('../../app/seeder');
const api = require('../fixtures/api');

const assert = require('assert');

describe('switchGene', () => {
  it('switches two genes in the individual', () => {
    const individual = Seeder.make(api(), 1)[0];

    const mutatedIndividual = switchGene(individual);

    assert.notDeepEqual(
      individual,
      mutatedIndividual
    );

    assert.deepEqual(
      individual.map(gene => gene.toString()),
      mutatedIndividual.map(gene => gene.toString())
    );
  });
});
