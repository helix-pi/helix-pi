const _ = require('lodash');

const addGene = require('./mutations/add-gene');
const switchGene = require('./mutations/switch-gene');
const removeGene = require('./mutations/remove-gene');
const shuffleGenes = _.shuffle;

const mutations = [
  addGene,
  switchGene,
  removeGene,
  shuffleGenes
];

function mutateIndividual (individual) {
  return _.sample(mutations)(individual);
}

module.exports = mutateIndividual;
