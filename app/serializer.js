
function serialize (individual) {
  const brokenDownGenes = individual.map(gene => {
    return {
      func: (gene.f || gene).toString(),
      args: gene.args
    }
  });

  return JSON.stringify(brokenDownGenes);
}

function deserialize (str) {
  return JSON.parse(str).map(serializedGene => {
    const serializedFunction = serializedGene.func;
    const startArgs = serializedFunction.indexOf('(') + 1;
    const startBody = serializedFunction.indexOf('{') + 1;

    const endArgs = serializedFunction.indexOf(')');
    const endBody = serializedFunction.lastIndexOf('}');

    const args = serializedFunction.substring(startArgs, endArgs);
    const body = serializedFunction.substring(startBody, endBody);

    const f = new Function(args, body);

    const wrapper = (entity, api, currentFrame) => {
      return f(entity, api, Object.assign(serializedGene.args, {currentFrame}));
    };

    wrapper.f = f;
    wrapper.args = serializedGene.args;

    return wrapper;
  });
}

module.exports = {
  serialize,
  deserialize
};
