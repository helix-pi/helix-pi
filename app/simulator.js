var _ = require('lodash');
var createApi = require('./api');

function simulateWorld (entities, numberOfFrames, input = [], currentFrame = 0) {
  var checkButtonDown = function (entity, button, currentFrame) {
    return input.filter(buttonPress => {
      return buttonPress.key === button &&
             buttonPress.startFrame < currentFrame &&
             buttonPress.endFrame > currentFrame;
    }).length > 0;
  };

  function distance (entityA, entityB) {
    var distanceVector = {
      x: Math.abs(entityA.x - entityB.x),
      y: Math.abs(entityA.y - entityB.y)
    };

    return Math.sqrt(Math.pow(distanceVector.x, 2) + Math.pow(distanceVector.y, 2));
  }

  function tweenEntity (entity, currentFrame) {
    entity.moveToFrame(currentFrame);
  };

  function tweenInactiveEntitiesToFrame (entities, currentFrame) {
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
    }).length >= 1;
  }

  const api = createApi({
    checkCollision: checkCollision,
    checkButtonDown
  });

  const activeEntities = entities.filter(entity => entity.active);

  function simulateFrame (frame) {
    activeEntities.forEach(simulateEntity.bind(this, frame));
  }

  function simulateEntity (frame, entity) {
    _.each(entity.individual, simulateGene.bind(this, frame, entity));
    api.update(entity);
  };

  function simulateGene (frame, entity, gene) {
    gene(entity, api, frame);
  }

  _.times(numberOfFrames, simulateFrame);
}

module.exports = simulateWorld;
