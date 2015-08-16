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
  }

  function tweenInactiveEntitiesToFrame (entities, currentFrame) {
    _.filter(entities, 'active', false).forEach(entity => tweenEntity(entity, currentFrame));
  }

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

  // HERE BE FOR LOOPS AND VAR (for the sake of performance)

  function simulateFrame (frame) {
    var activeEntity;

    for (var entityIndex = 0; entityIndex < activeEntities.length; entityIndex++) {
      activeEntity = activeEntities[entityIndex];
      simulateEntity(frame, activeEntity);
    }
  }

  function simulateEntity (frame, entity) {
    var gene;

    for (var geneIndex = 0; geneIndex < entity.individual.length; geneIndex++) {
      gene = entity.individual[geneIndex];

      simulateGene(frame, entity, gene);
    }

    api.update(entity);
  }

  function simulateGene (frame, entity, gene) {
    gene(entity, api, frame);
  }

  const maxFrame = currentFrame + numberOfFrames;

  for (var frame = currentFrame; frame < maxFrame; frame++) {
    simulateFrame(frame);
  }
}

module.exports = simulateWorld;
