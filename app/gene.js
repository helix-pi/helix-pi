const _ = require('lodash');

const getRandomInt = require('../lib/get-random-int');

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
    return api.checkCollision(entity, currentFrame);
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

function _firstFrameConditional (entity, api, {currentFrame}) {
  return currentFrame === 0;
}

function firstFrameConditional (schema) {
  return functionWithPackedArgs({}, _firstFrameConditional);
}

function generateConditional (schema) {
  return _.sample([
    positionConditional,
    collisionConditional,
    inputConditional,
    firstFrameConditional
  ])(schema);
}

function commandGene (entity, api, {command, commandArgs}) {
  return api[command].apply(null, [entity].concat(commandArgs));
}

function getRandomCommand (schema) {
  const possibleCommands = Object.keys(schema)
    .filter(possibleCommand => schema[possibleCommand].type === 'command');

  const command = _.sample(possibleCommands);

  const commandArgs = schema[command].parameters();

  return functionWithPackedArgs({command, commandArgs}, commandGene);
}

function _unconditional (entity, api, {command}) {
  return command(entity, api);
}

function unconditional (schema, command) {
  return functionWithPackedArgs({command}, _unconditional);
}

function _conditional (entity, api, {currentFrame, conditionalToCheck, command}) {
  if (conditionalToCheck(entity, api, currentFrame)) {
    return command(entity, api, currentFrame);
  }
}

function conditional (schema, command) {
  const conditionalToCheck = generateConditional(schema);

  return functionWithPackedArgs({conditionalToCheck, command}, _conditional);
}

function _ifElse (entity, api, {currentFrame, conditionalToCheck, command, alternateCommand}) {
  if (conditionalToCheck(entity, api, currentFrame)) {
    return command(entity, api);
  } else {
    return alternateCommand(entity, api);
  }
}

function ifElse (schema, command, alternateCommand) {
  const conditionalToCheck = generateConditional(schema);

  return functionWithPackedArgs({conditionalToCheck, command, alternateCommand}, _ifElse);
}

function Gene (schema) {
  const command = getRandomCommand(schema);
  const alternateCommand = getRandomCommand(schema);

  return _.sample([
    unconditional,
    conditional,
    ifElse
  ])(schema, command, alternateCommand);
}

module.exports = Gene;

