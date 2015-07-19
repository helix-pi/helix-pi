const {either, checkReturnType} = require('./type-checking');

var api = {};

const UPDATE = 'update';
const COMMAND = 'command';
const QUERY = 'query';

function declareApiCall (name, options, f) {
  const wrappedFunction = Object.assign(checkReturnType(name, options, f), options);

  api[name] = wrappedFunction;
}

function createApi (implementation) {
  declareApiCall('update', {
    type: UPDATE,
    takes: null,
    returns: undefined
  }, function (entity) {
    entity.x += entity.velocity.x;
    entity.y += entity.velocity.y;
  });

  declareApiCall('setVelocity', {
    type: COMMAND,
    takes: {x: 0, y: 0},
    returns: undefined
  }, function (entity, velocity) {
    entity.velocity = Object.assign({}, velocity);
  });

  declareApiCall('applyForce', {
    type: COMMAND,
    takes: {x: 0, y: 0},
    returns: undefined
  }, function (entity, velocity) {
    entity.velocity.x += velocity.x;
    entity.velocity.y += velocity.y;
  });

  declareApiCall('stop', {
    type: COMMAND,
    takes: null,
    returns: undefined
  }, function (entity) {
    entity.velocity = {x: 0, y: 0};
  });

  declareApiCall('getPosition', {
    type: QUERY,
    takes: [],
    returns: {x: 0, y: 0}
  }, function (entity) {
    return {
      x: entity.x,
      y: entity.y
    };
  });

  declareApiCall('checkButtonDown', {
    type: QUERY,
    takes: ['right', 'left', 'up', 'down'],
    returns: either(true, false)
  }, implementation.checkButtonDown);

  declareApiCall('checkCollision', {
    type: QUERY,
    takes: null,
    returns: either(true, false)
  }, implementation.checkCollision);

  return api;
};

module.exports = createApi;

