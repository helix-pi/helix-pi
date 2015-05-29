var _ = require('lodash');

function simulateWorld(entity, numberOfFrames, api) {
  var entityApi = api(entity);

  _.times(numberOfFrames, () => {
    _.each(entity.individual, function (gene) {
      gene(entityApi);
    });
  });
}

module.exports = simulateWorld;
