var World = require("../app/world");
var assert = require("assert");

describe('World', () => {
  var entities = [{name: 'nick'}, {name: 'alex'}];
  var world = new World(entities);

  describe('#new', () => {
    it('works', () => {
      assert.notEqual(world, undefined);
    });
  });

  describe('#entities', () => {
    it('returns some entities', () => {
      assert.equal(world.entities, entities);
    });
  });
});

