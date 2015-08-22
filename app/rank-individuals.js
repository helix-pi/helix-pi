const _ = require('lodash');

function calculateTotalFitness (individuals) {
  return _.sum(individuals.map(individual => individual.fitness.weightedScore));
}

function assignNormalizedFitness (totalFitness) {
  return function (individual) {
    if (totalFitness === 0) {
      individual.fitness.normalized = 1;
      return;
    }

    individual.fitness.normalized = individual.fitness.weightedScore / totalFitness;
  };
}

function sortByFitnessDescending (individuals) {
  return individuals.sort((a, b) => a.normalizedFitness - b.normalizedFitness);
}

function assignRank (accumulatedRank, individual) {
  individual.rank = accumulatedRank + individual.fitness.normalized;

  return individual.rank;
}

function rankIndividuals (individuals) {
  individuals.forEach(assignNormalizedFitness(calculateTotalFitness(individuals)));

  const sortedIndividuals = sortByFitnessDescending(individuals);

  sortedIndividuals.reduce(assignRank, 0);

  return sortedIndividuals;
}

module.exports = rankIndividuals;
