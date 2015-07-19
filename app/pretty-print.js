function prettyPrint (individual) {
  return individual.map(prettyGene).join('\n');
};

function prettyGene (gene) {
  if (gene.args !== undefined) {
    return JSON.stringify(prettyArguments(gene.args), null, '\t') +
      '\n' +
      (gene.f || gene).toString();
  };

  return (gene.f || gene).toString();
}

function prettyArguments (args) {
  if (args === undefined) { return args; };

  return Object.keys(args)
    .map(argument => prettyArgument(argument, args[argument]))
    .reduce((prettyArgs, argument) => Object.assign(prettyArgs, argument), {});
}

function prettyArgument (argumentName, value) {
  if (typeof value === 'function') {
    return {[argumentName]: prettyGene(value)};
  }

  return {[argumentName]: value};
}

module.exports = prettyPrint;
