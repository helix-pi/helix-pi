var _ = require('lodash');

function astToCode(node) {
  if (node.nodeType === 'api') {
    // TODO - support more than one arg
    return `api.${node.apiCall}(${JSON.stringify(node.args[0])})`;
  }

  return node.children.map(astToCode).join('\n');
}

function simulateWorld(entity, numberOfFrames) {
  var api = {
    move(coordinates) {
      entity.position.x += coordinates.x;
      entity.position.y += coordinates.y;
    }
  }

  _.times(numberOfFrames, () => {
    eval(astToCode(entity.individual));
  });
}

module.exports = simulateWorld;
