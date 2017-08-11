/* globals describe, it */

const mutateGene = require('../../app/mutations/mutate-gene');
const Seeder = require('../../app/seeder');
const api = require('../fixtures/api');

const assert = require('assert');

describe('mutateGene', () => {
  it('changes one gene in the individual', () => {
    const individual = Seeder.make(api(), 1)[0];

    const mutatedIndividual = mutateGene(individual, api());

    console.log(individual.map(gene => gene.args.command.args));
    console.log('\nvs.\n');
    console.log(mutatedIndividual.map(gene => gene.args.command.args));

    assert.notDeepEqual(
      individual,
      mutatedIndividual
    );
  });
});

