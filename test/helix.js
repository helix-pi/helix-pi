var run = require('../helix');
var assert = require("assert");

function astToCode(node) {
  if (node.nodeType === 'api') {
    // TODO - support more than one arg
    return `api.${node.apiCall}(${JSON.stringify(node.args[0])})`;
  }

  return node.children.map(astToCode).join('\n');
}

describe('Helix', () => {
  describe('#run', () => {
    it('returns an array of entities with fitnesses', () => {
      var results = run();
      console.log(results);
      console.log(astToCode(results[0].entity.individual));
      console.log(results[0].entity.position);
      assert(!isNaN(results[0].fitness));
    });
  });
});
