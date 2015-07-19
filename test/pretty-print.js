const prettyPrint = require('../app/pretty-print');
const assert = require('assert');

describe("prettyPrint", () => {
  it("returns a readable representation of an individual", () => {
    const gene = (entity, api, args) => {
      args.command(entity, api, args.currentFrame);
    }

    const wrapWithArgs = (args, f) => {
      const wrapper = (entity, api, currentFrame) => {
        return f(entity, api, Object.assign(args, {currentFrame}));
      };

      wrapper.f = f;
      wrapper.f = args;

      return wrapper;
    }

    const commandArgs = {velocity: {x: 1, y: 0}};

    const args = {
      command: wrapWithArgs(commandArgs, (entity, api, args) => api.setVelocity(entity, args.velocity))
    }

    const individual = [
      wrapWithArgs(args, gene)
    ]

// TODO - re-enable
//    assert.equal(prettyPrint(individual), `
//      function anonymous (entity, api, args) {
//        args.command(entity, api, {velocity: {x: 1, y: 0}});
//     }
//    `);
  });
});
