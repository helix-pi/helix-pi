var _ = require('lodash');

function simulateWorld (entities, numberOfFrames, api, input, currentFrame) {
  function getButtonDown(button, currentFrame) {
    return input.filter((buttonPress) => {
      return buttonPress.key === button &&
             buttonPress.startFrame < currentFrame &&
             buttonPress.endFrame > currentFrame;
    }).length > 0;
  }

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

  _.times(numberOfFrames, (frame) => {
    _.each(entities, (entity) => {
      var entityApi = api(entity, getButtonDown, checkCollision);

      _.each(entity.individual, function (gene) {
        gene(entityApi, currentFrame + frame);
      });

      entityApi.update();
    });
  });
}

module.exports = simulateWorld;
