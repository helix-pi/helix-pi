function breed(mum, dad) {
  var totalGenes = mum.children.length + dad.children.length;

  var genes = mum.children.concat(dad.children);
  var midPoint = Math.floor(totalGenes / 2);

  return [
    {
      nodeType: 'root',
      children: genes.slice(0, midPoint)
    },

    {
      nodeType: 'root',
      children: genes.slice(midPoint)
    }
  ];
}

module.exports = breed;
