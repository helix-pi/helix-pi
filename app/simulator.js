var _ = require('lodash');

function simulateWorld(entity, numberOfFrames) {
  var api = {
    move(coordinates) {
      entity.position.x += coordinates.x;
      entity.position.y += coordinates.y;
    }
  }

  _.times(numberOfFrames, () => {
    _.each(entity.individual, function (gene) {
      gene(api);
    });
  });
}

module.exports = simulateWorld;
