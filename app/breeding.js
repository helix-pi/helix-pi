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

function selectPairForBreeding (individuals) {
  const dadIndex = selectIndividualForBreeding(individuals);

  const dad = individuals[dadIndex];

  const otherIndividuals = individuals.slice(0);

  otherIndividuals.splice(dadIndex, 1);

  const mumIndex = selectIndividualForBreeding(otherIndividuals);

  let mum = individuals[mumIndex];

  if (mumIndex === -1) {
    mum = _.first(otherIndividuals);
  }

  return [dad, mum];
}

function selectIndividualForBreeding (individuals) {
  const rand = Math.random();

  return individuals.findIndex(i => i.rank >= rand);
}

const numberOfEliteToKeep = 2;

function breedFittestIndividualsForParticipant (participant, individuals, population, fittestIndividualsOfAllTime) {
  rankIndividuals(individuals);

  fittestIndividualsOfAllTime[participant] = fittestIndividualsOfAllTime[participant]
    .concat(individuals)
    .sort((a, b) => b.fitness.score - a.fitness.score)
    .slice(0, Math.ceil(population / 4));

  const breedingPairs = _.range(individuals.length / 2 - numberOfEliteToKeep)
    .map(_ => selectPairForBreeding(individuals));

  const fittestIndividuals = individuals
    .sort((a, b) => b.fitness.score - a.fitness.score);

  const elite = fittestIndividuals.slice(0, numberOfEliteToKeep);

  const newbornIndividuals = breedingPairs.map(pair => breed.apply(null, pair));

  return elite.concat(_.flatten(newbornIndividuals));
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
