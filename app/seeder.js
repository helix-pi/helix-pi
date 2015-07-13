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

  return (entity, api) => operator(a(entity, api), b(entity, api));
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

function inputConditional (schema) {
  const buttonToCheck = _.sample(schema.checkButtonDown.takes);
  const buttonQuery = _.sample(['checkButtonDown']);

  return (entity, api, currentFrame) => api[buttonQuery](entity, buttonToCheck, currentFrame);
}

function generateConditional (schema) {
  return _.sample([
    positionConditional,
    collisionConditional,
    inputConditional
  ])(schema);
}

function functionWithPackedArgs (args, f) {
  const wrapper = (entity, api, currentFrame) => {
    f(entity, api, Object.assign(args, {currentFrame}));
  };

  wrapper.f = f;
  wrapper.args = args;

  return wrapper;
}


// TODO - genericize
function getRandomCommand (schema) {
  var command = _.sample(['setVelocity', 'stop', 'applyForce']);

  if (command === 'setVelocity') {
    const velocity = {
      x: getRandomInt(-10, 10),
      y: getRandomInt(-10, 10)
    };

    return functionWithPackedArgs({velocity}, (entity, api, {velocity}) => {
      api.setVelocity(entity, velocity);
    });
  }

  if (command === 'stop') {
    return (entity, api) => api.stop(entity);
  };

  if (command === 'applyForce') {
    const forceRange = 0.3;
    const force = {
      x: getRandomFloat(-forceRange, forceRange),
      y: getRandomFloat(-forceRange, forceRange)
    };

    return functionWithPackedArgs({force}, (entity, api, {force}) =>
      api.applyForce(entity, force)
    );
  };
}

function _unconditional (entity, api) {
  command(entity, api);
}

function unconditional (schema, command) {
  return functionWithPackedArgs({command}, _unconditional);
};

function _conditional (entity, api, {currentFrame, conditionalToCheck, command}) {
  if (conditionalToCheck(entity, api, currentFrame)) {
    command(entity, api);
  };
};

function conditional (schema, command) {
  const conditionalToCheck = generateConditional(schema);

  return functionWithPackedArgs({conditionalToCheck, command}, _conditional);
}

function _ifElse (entity, api, {currentFrame, conditionalToCheck, command, alternateCommand}) {
  if (conditionalToCheck(entity, api, currentFrame)) {
    command(entity, api);
  } else {
    alternateCommand(entity, api);
  };
}

function ifElse (schema, command, alternateCommand) {
  const conditionalToCheck = generateConditional(schema);

  return functionWithPackedArgs({conditionalToCheck, command, alternateCommand}, _ifElse);
}

function newNode (schema) {
  var command = getRandomCommand(schema);
  var alternateCommand = getRandomCommand(schema);

  return _.sample([
    unconditional,
    conditional,
    ifElse
  ])(schema, command, alternateCommand);
};

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
