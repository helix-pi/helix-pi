const _ = require('lodash');
const getRandomInt = require('../lib/get-random-int');

const Gene = require('./gene');

function generateIndividual (schema) {
  var entropy = getRandomInt(1, 20);

  return _.range(entropy).map(() => {
    return Gene(schema);
  });
}

var Seeder = {
  make (schema, numberOfIndividuals) {
    return _.range(numberOfIndividuals).map(() => {
      return generateIndividual(schema);
    });
  }
};

module.exports = Seeder;
