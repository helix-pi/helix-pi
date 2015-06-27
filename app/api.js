var api = {};

const UPDATE = 'update';
const COMMAND = 'command';
const QUERY = 'query';

function declareApiCall(name, options, f) {
  f.type = options.type;
  f.takes = options.takes;
  f.returns = options.returns;

  api[name] = f;
}

function createApi (implementation) {
  declareApiCall('update', {
    type: UPDATE,
    takes: null,
    returns: null
  }, function (entity) {
    entity.x += entity.velocity.x;
    entity.y += entity.velocity.y;
  });

  declareApiCall('setVelocity', {
    type: COMMAND,
    takes: {x: 0, y: 0},
    returns: null
  }, function (entity, velocity) {
    entity.velocity = velocity;
  });

  declareApiCall('stop', {
    type: COMMAND,
    takes: null,
    returns: null
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
    returns: [true, false]
  }, implementation.checkButtonDown);

  declareApiCall('checkButtonReleased', {
    type: QUERY,
    takes: ['right', 'left', 'up', 'down'],
    returns: [true, false],
  }, implementation.checkButtonReleased);

  declareApiCall('checkCollision', {
    type: QUERY,
    takes: null,
    returns: []
  }, implementation.checkCollision);

  return api;
};

module.exports = createApi;

