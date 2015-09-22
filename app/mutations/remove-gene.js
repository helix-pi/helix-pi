const getRandomInt = require('../../lib/get-random-int');

function removeGene (individual) {
  const geneIndexToRemove = getRandomInt(individual.length);

  const newIndividual = individual.slice();

  newIndividual.splice(geneIndexToRemove, 1);

  return newIndividual;
}

module.exports = removeGene;
