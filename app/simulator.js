var _ = require('lodash');
var memoize = require('memoizee');
var createApi = require('./api');

function simulateWorld (entities, numberOfFrames, input, currentFrame = 0) {
  var checkButtonDown = function (entity, button, currentFrame) {
    var result = input.filter((buttonPress) => {
      return buttonPress.key === button &&
             buttonPress.startFrame < currentFrame &&
             buttonPress.endFrame > currentFrame;
    }).length > 0;

    console.log({button, currentFrame, result});
    return result;
  };

  var checkButtonReleased = function (entity, button, currentFrame, inLastNumberOfFrames = 12) {
    if (currentFrame < inLastNumberOfFrames) {
      return false;
    }

    return !checkButtonDown(button, currentFrame) &&
            checkButtonDown(button, currentFrame - inLastNumberOfFrames);
  };

  function distance (entityA, entityB) {
    var distanceVector = {
      x: Math.abs(entityA.x - entityB.x),
      y: Math.abs(entityA.y - entityB.y)
    };

    return distance.x + distance.y;
  }

  function tweenEntity (entity, currentFrame) {
    entity.moveToFrame(currentFrame);
  };

  function tweenInactiveEntitiesToFrame (entities) {
    _.filter(entities, 'active', false).forEach(entity => tweenEntity(entity, currentFrame));
  };

  function checkCollision (entity, currentFrame) {
    tweenInactiveEntitiesToFrame(entities, currentFrame);

    return entities.filter((entityToCheck) => {
      // TODO - implement box model collision
      var collisionDistance = 32;

      return (
        entity !== entityToCheck &&
        distance(entity, entityToCheck) < collisionDistance
      );
    });
  }

  var api = createApi({
    checkCollision,
    checkButtonDown,
    checkButtonReleased
  });

  var activeEntities = entities.filter(entity => entity.active);

  _.times(numberOfFrames, (frame) => {
    _.each(activeEntities, (entity) => {
      _.each(entity.individual, function (gene) {
        gene(entity, api, currentFrame + frame);
      });

      api.update(entity);
    });
  });
}

module.exports = simulateWorld;
