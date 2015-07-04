var _ = require('lodash');
var getRandomFloat = require('../lib/get-random-float');
var getRandomInt = require('../lib/get-random-int');

const COMMAND = 'command';
const QUERY = 'query';

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

  return (entity, api) => { return operator(a(entity, api), b(entity, api)); };
}

function positionConditional (schema) {
  const randomX = getRandomInt(0, 600);
  const randomY = getRandomInt(0, 400);
  const positionToCheck = _.sample([randomX, randomY]);
  const attributeToCompare = randomAttribute(schema.getPosition.returns);

  return compare(
    [gt, lt],
    (entity, api) => api.getPosition(entity)[attributeToCompare],
    (entity, api) => positionToCheck
  );
}

function collisionConditional (schema) {
  return (entity, api, currentFrame) => api.checkCollision(entity, currentFrame);
}

function generateConditional (schema) {
  return _.sample([
    positionConditional(schema),
    collisionConditional(schema)
  ]);
}


// TODO - genericize
function getRandomCommand (schema) {
  var command = _.sample(['setVelocity', 'stop', 'applyForce']);

  if (command === 'setVelocity') {
    var velocity = {
      x: getRandomInt(-10, 10),
      y: getRandomInt(-10, 10)
    };

    return (entity, api) => {
      api.setVelocity(entity, velocity);
    };
  }

  if (command === 'stop') {
    return (entity, api) => api.stop(entity);
  };

  if (command === 'applyForce') {
    const forceRange = 0.5;
    const force = {
      x: getRandomFloat(-forceRange, forceRange),
      y: getRandomFloat(-forceRange, forceRange)
    };

    return (entity, api) => api.applyForce(entity, force);
  };
}

function newNode (schema) {
  var actionSelector = getRandomInt(0, 100);


  var command = getRandomCommand(schema);
  var alternateCommand = getRandomCommand(schema);


  // There is a 20% chance to emit a node that operates as a NOP if a button is not down
  if (schema.checkButtonDown && actionSelector > 80) {
    var buttonToCheck = _.sample(schema.checkButtonDown.takes);
    var buttonQuery = _.sample(['checkButtonDown']);

    return (entity, api, currentFrame) => {
      if (api[buttonQuery](entity, buttonToCheck, currentFrame)) {
        command(entity, api);
      }
    };
  }

  // There is a 30% chance to emit a node that picks between two nodes depending on an XY position
  // The paucity of this - in a history sense - is probably why circles are so awful
  if (actionSelector > 50) {
    let condition = generateConditional(schema);

    return (entity, api, currentFrame) => {
      if (condition(entity, api, currentFrame)) {
        command(entity, api);
      } else {
        alternateCommand(entity, api);
      }
    };
  };

  if (actionSelector > 25) {
    return (entity, api, currentFrame) => {
      // TODO - do something with collision results aside from checking length
      if (api.checkCollision && api.checkCollision(entity, currentFrame).length > 0) {
        command(entity, api);
      };
    }
  }

  return (entity, api) => {
    command(entity, api);
  };
}

function generateIndividual (schema) {
  var entropy = getRandomInt(1, 20);

  return _.chain(entropy).range().map(() => {
    return newNode(schema);
  }).value();
}

var Seeder = {
  make (schema, numberOfIndividuals) {
    return _.chain(numberOfIndividuals).range().map(() => {
      return generateIndividual(schema);
    }).value();
  }
};

module.exports = Seeder;
