var getRandomInt = require('../lib/get-random-int');
var _ = require('lodash');

function breed (mum, dad) {
  const genes = mum.concat(dad);

  // A random position across the combined genes, excluding the first and last gne
  const midPoint = getRandomInt(1, genes.length - 2);

  return [
    genes.slice(0, midPoint),
    genes.slice(midPoint)
  ];
}


function breedFittestIndividualsForParticipant (participant, individuals, population, fittestIndividualsOfAllTime) {
  const fittestIndividuals = individuals
    .sort((a, b) => b.fitness.weightedScore - a.fitness.weightedScore)
    .slice(0, Math.ceil(population / 2));

  fittestIndividualsOfAllTime[participant] = fittestIndividualsOfAllTime[participant]
    .concat(fittestIndividuals)
    .sort((a, b) => b.fitness.score - a.fitness.score)
    .slice(0, Math.ceil(population / 4));

  var breedingPairs = eachSlice(fittestIndividuals, 2);

  return _.flatten(breedingPairs.map(pair => breed.apply(this, pair)));
}

function breedFittestIndividuals (individuals, population, fittestIndividualsOfAllTime) {
  return _.chain(individuals)
    .map((individuals, participant) => {
      return [participant, breedFittestIndividualsForParticipant(participant, individuals, population, fittestIndividualsOfAllTime)];
    }).object().value();
}

function eachSlice (array, sizeOfSlice) {
  return _.chain(array).groupBy((item, index) => {
    return Math.floor(index / sizeOfSlice);
  }).toArray().value();
}

module.exports = breedFittestIndividuals;
