
function serialize (individual) {
  return JSON.stringify(individual.map(f => f.toString()));
}

function deserialize (str) {
  return JSON.parse(str).map(serializedGene => {
    const startArgs = serializedGene.indexOf('(') + 1;
    const startBody = serializedGene.indexOf('{') + 1;

    const endArgs = serializedGene.indexOf(')');
    const endBody = serializedGene.lastIndexOf('}');

    const args = serializedGene.substring(startArgs, endArgs);
    const body = serializedGene.substring(startBody, endBody);

    return new Function(args, body);
  });
}

module.exports = {
  serialize,
  deserialize
};
