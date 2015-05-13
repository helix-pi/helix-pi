var _ = require('lodash');

// TODO - extract to lib
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


function findNodeToAddTo(individual) {
  // TODO - make this actually find something other than root
  return individual;
}


function newNode() {
  move = {
    x: getRandomInt(-10, 10),
    y: getRandomInt(-10, 10),
  };

  return (function(api) {
    api.move(move);
  });
}

function generateIndividual() {
  var entropy = getRandomInt(1, 10);

  return _.chain(entropy).range().map(function() {
    return newNode();
  }).value();
}

var Seeder = {
  make(numberOfIndividuals) {
    var output = [];

    _.times(numberOfIndividuals, () => {
      output.push(generateIndividual());
    });

    return output;
  }
};

module.exports = Seeder;
