var _ = require('lodash');
var getRandomFloat = require('../lib/get-random-float');
var getRandomInt = require('../lib/get-random-int');

const COMMAND = 'command';
const QUERY = 'query';

function functionWithPackedArgs (args, f) {
  const wrapper = (entity, api, currentFrame) => {
    return f(entity, api, Object.assign(args, {currentFrame}));
  };

  wrapper.f = f;
  wrapper.args = args;

  return wrapper;
}

function gt (a, b) {
  return a > b;
}

function lt (a, b) {
  return a < b;
}

function randomAttribute (object) {
  return _.sample(Object.keys(object));
}

// lol never mind the fact that a and b are passed in as args to themselves. this is crazy
function compare () {
  return (entity, api, {currentFrame, a, b, operator}) => {
    const aResult = a(entity, api, currentFrame);
    const bResult = b(entity, api, currentFrame);
    return operator(aResult, bResult);
  };
}

function positionConditional (schema) {
  const randomX = getRandomInt(0, 600);
  const randomY = getRandomInt(0, 400);

  const operator = _.sample([gt, lt]);

  const aArgs = {attributeToCompare: randomAttribute(schema.getPosition.returns)};
  const bArgs = {positionToCheck: _.sample([randomX, randomY])};

  const args = {
    operator,
    a: functionWithPackedArgs(aArgs, (entity, api, {attributeToCompare}) => api.getPosition(entity)[attributeToCompare]),
    b: functionWithPackedArgs(bArgs, (entity, api, {positionToCheck}) => positionToCheck)
  };

  return functionWithPackedArgs(args, compare());
}

function collisionConditional (schema) {
  return (entity, api, {currentFrame}) => {
    return api.checkCollision(entity, currentFrame).length > 1;
  };
}

function _inputConditional (entity, api, {currentFrame, buttonToCheck}) {
  return api.checkButtonDown(entity, buttonToCheck, currentFrame);
}

function inputConditional (schema) {
  const args = {
    buttonToCheck: _.sample(schema.checkButtonDown.takes)
  };

  return functionWithPackedArgs(args, _inputConditional);
}

function generateConditional (schema) {
  return _.sample([
    positionConditional,
    collisionConditional,
    inputConditional
  ])(schema);
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

function _unconditional (entity, api, {command}) {
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
