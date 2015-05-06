var run = require('../helix');
var assert = require("assert");

describe('Helix', () => {
  describe('#run', () => {
    it('returns an array of entities with fitnesses', () => {
      assert(!isNaN(run()[0].fitness));
    });
  });
});
