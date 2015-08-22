const rankIndividuals = require('./rank-individuals');

const getRandomInt = require('../lib/get-random-int');
const _ = require('lodash');

function breed (mum, dad) {
  const genes = mum.concat(dad);

  // A random position across the combined genes, excluding the first and last gne
  const midPoint = getRandomInt(1, genes.length - 2);

  return [
    genes.slice(0, midPoint),
    genes.slice(midPoint)
  ];
}

function selectIndividualForBreeding (individuals) {
  const rand = Math.random();

  return individuals.find(i => i.rank >= rand);
}

function breedFittestIndividualsForParticipant (participant, individuals, population, fittestIndividualsOfAllTime) {
  rankIndividuals(individuals);

  fittestIndividualsOfAllTime[participant] = fittestIndividualsOfAllTime[participant]
    .concat(individuals)
    .sort((a, b) => b.fitness.score - a.fitness.score)
    .slice(0, Math.ceil(population / 4));

  const individualsToBreed = _.range(individuals.length / 2)
    .map(_ => selectIndividualForBreeding(individuals));

  const breedingPairs = eachSlice(individualsToBreed, 2);

  return _.flatten(breedingPairs.map(pair => breed.apply(null, pair)));
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
