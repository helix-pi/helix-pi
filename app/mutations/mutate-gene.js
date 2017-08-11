const _ = require('lodash');

const getRandomInt = require('../../lib/get-random-int');

module.exports = function mutateGene (individual, schema) {
  if (individual.length === 0) {
    return individual;
  }

  const geneIndexToMutate = getRandomInt(0, individual.length);

  const newIndividual = _.cloneDeep(individual);

  const geneToMutate = newIndividual[geneIndexToMutate];

  const argsToMutate = geneToMutate.args.command.args;
  const command = argsToMutate.command;

  console.log('\n');

  console.log(argsToMutate);

  const newGeneArgsCommand = {
    command,
    commandArgs: schema[command].parameters()
  };

  console.log('->');

  console.log(newGeneArgsCommand);

  console.log('---\n');

  geneToMutate.args.command.args = newGeneArgsCommand;

  return newIndividual;
};
