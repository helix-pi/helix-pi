var getRandomInt = require('../lib/get-random-int');

function breed (mum, dad) {
  const genes = mum.concat(dad);

  // A random position across the combined genes, excluding the first and last gne
  const midPoint = getRandomInt(1, genes.length - 2);

  return [
    genes.slice(0, midPoint),
    genes.slice(midPoint)
  ];
}

module.exports = breed;
