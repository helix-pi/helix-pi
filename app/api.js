const _ = require('lodash');

const {either, checkReturnType} = require('./type-checking');
const getRandomFloat = require('../lib/get-random-float');

var api = {};

const UPDATE = 'update';
const COMMAND = 'command';
const QUERY = 'query';

function declareApiCall (name, options, f) {
  const wrappedFunction = Object.assign(checkReturnType(name, options, f), options);

  api[name] = wrappedFunction;
}

// Define a standard for takes and returns
// must respect positional arguments and contain enough information that arguments can be generated
// specify verify/generate functions?
// or provide tools like range and select

function createApi (implementation) {
  declareApiCall('update', {
    type: UPDATE,
    takes: null,
    returns: undefined,
    parameters: () => []
  }, function (entity) {
    entity.x += entity.velocity.x;
    entity.y += entity.velocity.y;
  });

  const velocityRange = 10;

  declareApiCall('setVelocity', {
    type: COMMAND,
    takes: {x: 0, y: 0},
    returns: undefined,
    parameters: () => [
      {
        x: getRandomFloat(-velocityRange, velocityRange),
        y: getRandomFloat(-velocityRange, velocityRange)
      }
    ]
  }, function (entity, velocity) {
    entity.velocity = Object.assign({}, velocity);
  });

  const forceRange = 0.3;

  declareApiCall('applyForce', {
    type: COMMAND,
    takes: {x: 0, y: 0},
    returns: undefined,
    parameters: () => [
      {
        x: getRandomFloat(-forceRange, forceRange),
        y: getRandomFloat(-forceRange, forceRange)
      }
    ]
  }, function (entity, velocity) {
    entity.velocity.x += velocity.x;
    entity.velocity.y += velocity.y;
  });

  declareApiCall('stop', {
    type: COMMAND,
    takes: null,
    returns: undefined,
    parameters: () => []
  }, function (entity) {
    entity.velocity = {x: 0, y: 0};
  });

  declareApiCall('getPosition', {
    type: QUERY,
    takes: [],
    returns: {x: 0, y: 0},
    parameters: () => []
  }, function (entity) {
    return {
      x: entity.x,
      y: entity.y
    };
  });

  const possibleDirections = ['right', 'left', 'up', 'down'];
  const moveRange = {min: 0, max: 5};

  declareApiCall('move', {
    type: COMMAND,
    takes: possibleDirections,
    returns: undefined,
    parameters: () => [
      _.sample(possibleDirections),
      getRandomFloat(moveRange.min, moveRange.max)
    ]
  }, function (entity, direction, distance) {
    const velocity = {
      right: {
        x: distance,
        y: 0
      },

      left: {
        x: -distance,
        y: 0
      },

      down: {
        x: 0,
        y: distance
      },

      up: {
        x: 0,
        y: -distance
      }
    };

    entity.x += velocity[direction].x;
    entity.y += velocity[direction].y;
  });

  const possibleButtons = ['right', 'left', 'up', 'down', 'w', 'a', 's', 'd'];

  declareApiCall('checkButtonDown', {
    type: QUERY,
    takes: possibleButtons,
    returns: either(true, false),
    parameters: () => [_.sample(possibleButtons)]
  }, implementation.checkButtonDown);

  declareApiCall('checkCollision', {
    type: QUERY,
    takes: [],
    returns: either(true, false),
    parameters: () => []
  }, implementation.checkCollision);

  return api;
}

module.exports = createApi;

