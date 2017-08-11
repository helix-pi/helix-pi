const _ = require('lodash');

const addGene = require('./mutations/add-gene');
const switchGene = require('./mutations/switch-gene');
const removeGene = require('./mutations/remove-gene');
const mutateGene = require('./mutations/mutate-gene');

const mutations = [
  addGene,
  switchGene,
  removeGene,
  mutateGene
];

function mutateIndividual (individual, schema) {
  return _.sample(mutations)(individual, schema);
}

module.exports = mutateIndividual;
