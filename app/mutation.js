const _ = require('lodash');

function mutateIndividual (individual) {
  return _.shuffle(individual);
}

module.exports = mutateIndividual;
