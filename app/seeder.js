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

  var randomX = getRandomInt(0, 600);
  var randomY = getRandomInt(0, 400);

  if (api.checkButtonDown && getRandomInt(0, 100) > 80) {
    var buttonToCheck = _.sample(api.checkButtonDown.takes);
    return (api, currentFrame) => {
      if (api.checkButtonDown(buttonToCheck, currentFrame)) {
        api.move(move);
      }
    }
  }

  if (getRandomInt(0, 100) > 60) {
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
  } else {
    return (api) => {
      api.move(move);
    };
  }
}

function generateIndividual (api) {
  var entropy = getRandomInt(1, 10);

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
