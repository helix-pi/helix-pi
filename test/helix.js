var run = require('../helix');
var assert = require("assert");

describe('Helix', () => {
  describe('#run', () => {
    it('returns an array of entities with fitnesses', () => {
      var results = run();
      assert(!isNaN(results[0].fitness));
    });
  });
});
