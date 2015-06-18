var _ = require('lodash');
var getRandomInt = require('../lib/get-random-int');

function gt (a, b) {
  return a > b;
}

function lt (a, b) {
  return a < b;
}

function randomAttribute (object) {
  return _.sample(Object.keys(object));
}

function compare (operators, a, b) {
  var operator = _.sample(operators);

  return (api) => { return operator(a(api), b(api)); };
}

function newNode (api) {
  var move = {
    x: getRandomInt(-10, 10),
    y: getRandomInt(-10, 10)
  };

  var actionSelector = getRandomInt(0, 100);

  var randomX = getRandomInt(0, 600);
  var randomY = getRandomInt(0, 400);

  // There is a 20% chance to emit a node that operates as a NOP if a button is not down
  if (api.checkButtonDown && actionSelector > 80) {
    var buttonToCheck = _.sample(api.checkButtonDown.takes);
    return (api, currentFrame) => {
      if (api.checkButtonDown(buttonToCheck, currentFrame)) {
        api.move(move);
      }
    }
  }

  // There is a 30% chance to emit a node that picks between two nodes depending on an XY position
  // The paucity of this - in a history sense - is probably why circles are so awful
  if (actionSelector > 50) {
    var differentMove = {
      x: getRandomInt(-10, 10),
      y: getRandomInt(-10, 10)
    };

    var attributeToCompare = randomAttribute(api.getPosition.returns);
    var condition = compare(
      [gt, lt],
      function (api) { return api.getPosition()[attributeToCompare]; },
      function (api) { return _.sample([randomX, randomY]); }
    );

    return (api) => {
      if (condition(api)) {
        api.move(move);
      } else {
        api.move(differentMove);
      }
    };
  };

  return (api) => {
    api.move(move);
  };
}

function generateIndividual (api) {
  var entropy = getRandomInt(1, 50);

  return _.chain(entropy).range().map(() => {
    return newNode(api);
  }).value();
}

var Seeder = {
  make (api, numberOfIndividuals) {
    return _.chain(numberOfIndividuals).range().map(() => {
      return generateIndividual(api);
    }).value();
  }
};

module.exports = Seeder;
