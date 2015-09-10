function serialize (individual) {
  return JSON.stringify({positions: individual.positions, fitness: individual.fitness, individual: individual.map(serializeGene)});
}

function serializeGene (gene) {
  return {
    func: (gene.f || gene).toString(),
    args: serializeArgs(gene.args)
  };
}

function serializeArgs (args) {
  if (args === undefined) { return args; }

  return Object.keys(args)
    .map(key => serializeArgument(key, args[key]))
    .reduce((serializedArguments, argument) => Object.assign(serializedArguments, argument), {});
}

function serializeArgument (argument, value) {
  if (typeof value === 'function') {
    return {[argument]: serializeGene(value)};
  }

  return {[argument]: value};
}

function deserialize (str) {
  const deserializedResult = JSON.parse(str);
  const individual = deserializedResult.individual.map(deserializeGene);
  individual.fitness = deserializedResult.fitness;
  individual.positions = deserializedResult.positions;

  return individual;
}

function deserializeGene (serializedGene) {
  const serializedFunction = serializedGene.func;
  const startArgs = serializedFunction.indexOf('(') + 1;
  const startBody = serializedFunction.indexOf('{') + 1;

  const endArgs = serializedFunction.indexOf(')');
  const endBody = serializedFunction.lastIndexOf('}');

  const args = serializedFunction.substring(startArgs, endArgs);
  const body = serializedFunction.substring(startBody, endBody);

  const f = new Function(args, body);

  const deserializedArgs = deserializeArguments(serializedGene.args);

  const wrapper = (entity, api, currentFrame) => {
    return f(entity, api, Object.assign(deserializedArgs, {currentFrame}));
  };

  wrapper.f = f;
  wrapper.args = deserializedArgs;

  return wrapper;
}

function deserializeArguments (args) {
  if (args === undefined) {
    return {};
  }

  return Object.keys(args)
    .map(argument => deserializeArgument(argument, args[argument]))
    .reduce((deserializedArguments, argument) => Object.assign(deserializedArguments, argument), {});
}

function deserializeArgument (argument, value) {
  if (value.func === undefined) {
    return {[argument]: value};
  }

  return {[argument]: deserializeGene(value)};
}

serialize.results = (results) => {
  return JSON.stringify(Object.keys(results).map(participant => {
    return serializeResult(participant, results[participant]);
  }).reduce((serializedResults, result) => Object.assign(serializedResults, result), {}));
};

function serializeResult (participant, individuals) {
  return {[participant]: individuals.map(serialize)};
}

deserialize.results = (str) => {
  const results = JSON.parse(str);

  return Object.keys(results).map(participant => {
    const individuals = results[participant];

    return {[participant]: individuals.map(deserialize)};
  }).reduce((deserializedResults, result) => Object.assign(deserializedResults, result), {});
};

module.exports = {
  serialize,
  deserialize
};
