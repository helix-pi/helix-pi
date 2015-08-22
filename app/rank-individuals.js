// To select an individual for breeding, select a random number between 0 and 1
// The selected individual is the first one who's value is greater than the random number
// .find(individual => individual.rank > randomSelectionNumber)


const _ = require('lodash');

function calculateTotalFitness (individuals) {
  return _.sum(individuals.map(individual => individual.fitness.weightedScore));
}

function assignNormalizedFitness (totalFitness) {
  return function (individual) {
    individual.fitness.normalized = individual.fitness.weightedScore / totalFitness;
  };
}

function sortByFitnessDescending (individuals) {
  return individuals.sort((a, b) => a.normalizedFitness > b.normalizedFitness);
}

function assignRank (accumulatedRank, individual) {
  individual.rank = accumulatedRank + individual.fitness.normalized;

  return individual.rank;
}

function rankIndividuals (individuals) {
  individuals.forEach(assignNormalizedFitness(calculateTotalFitness(individuals)));

  const sortedIndividuals = sortByFitnessDescending(individuals);

  sortedIndividuals.reduce(assignRank, 0);

  return sortByFitnessDescending(individuals);
}

module.exports = rankIndividuals;
