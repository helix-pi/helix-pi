var _ = require('lodash');

function simulateWorld (entity, numberOfFrames, api, input, currentFrame) {
  function getButtonDown(button, currentFrame) {
    return input.filter((buttonPress) => {
      return buttonPress.key === button &&
             buttonPress.startFrame < currentFrame &&
             buttonPress.endFrame > currentFrame;
    }).length > 0;
  }

  var entityApi = api(entity, getButtonDown);

  _.times(numberOfFrames, (frame) => {
    _.each(entity.individual, function (gene) {
      gene(entityApi, currentFrame + frame);
    });
  });
}

module.exports = simulateWorld;
