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
  var move = {
    x: getRandomInt(-10, 10),
    y: getRandomInt(-10, 10),
  };

  var randomX = getRandomInt(0, 600);

  if (getRandomInt(0, 100) > 60) {
    var differentMove = {
      x: getRandomInt(-10, 10),
      y: getRandomInt(-10, 10),
    };

    return (function(api) {
      var condition = (api.getPosition().x < randomX);

      if (condition) {
        api.move(move);
      } else {
        api.move(differentMove);
      };
    });
  } else {
    return (function(api) {
      api.move(move);
    });
  }

}

function generateIndividual() {
  var entropy = getRandomInt(1, 10);

  return _.chain(entropy).range().map(function() {
    return newNode();
  }).value();
}

var Seeder = {
  make(numberOfIndividuals) {
    return _.chain(numberOfIndividuals).range().map(() => {
      return generateIndividual();
    }).value();
  }
};

module.exports = Seeder;
