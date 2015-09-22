const randomInt = require('../../lib/get-random-int');

function switchGene (individual) {
  const positionToSwap = randomInt(individual.length);
  const otherPositionToSwap = randomInt(individual.length);

  const firstGeneToMove = individual[positionToSwap];

  const newIndividual = individual.slice();
  newIndividual[positionToSwap] = newIndividual[otherPositionToSwap];

  newIndividual[otherPositionToSwap] = firstGeneToMove;

  return newIndividual;
}

module.exports = switchGene;
