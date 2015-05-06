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
  return {
    nodeType: 'api',
    apiCall: 'move',
    args: [{
      x: getRandomInt(-10, 10),
      y: getRandomInt(-10, 10),
    }],
  };
}

function generateIndividual() {
  var individual = {
    nodeType: 'root',
    children: [],
  };

  var numberOfThingsToAdd = getRandomInt(1, 10);

  _.times(numberOfThingsToAdd, () => {
    var nodeToAddTo = findNodeToAddTo(individual);
    nodeToAddTo.children.push(newNode());
  });

  return individual;
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
