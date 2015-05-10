function breed(mum, dad) {
  var totalGenes = mum.length + dad.length;

  var genes = mum.concat(dad);
  var midPoint = Math.floor(totalGenes / 2);

  return [
    genes.slice(0, midPoint),
    genes.slice(midPoint)
  ];
}

module.exports = breed;
