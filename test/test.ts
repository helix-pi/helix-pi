import * as assert from "assert";

import { simulate, helixPi } from "../src";

describe("Helix Pi", () => {
  it("takes a collection of scenarios and returns a data structure representing code that when executed fulfills the scenario", () => {
    // describe the most basic scenario
    // call helix pi
    // simulate the behaviour of the returned entities
    // check if they match the described behaviour of the actors in the scenario
    const input = {
      actors: ["keith"],
      keys: [],

      scenarios: [
        {
          id: '0',
          name: '0',
          input: {},

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: 1, y: 0 }
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {
      frames: 1
    });

    assert.deepEqual(simulationResult["keith"], { x: 1, y: 0 });
  });

  it("can go left", () => {
    const input = {
      actors: ["keith"],
      keys: [],

      scenarios: [
        {
          id: '0',
          name: '0',
          input: {},

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: -1, y: 0 }
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {
      frames: 1
    });

    assert.deepEqual(
      simulationResult["keith"],
      input.scenarios[0].actors.keith[1].position
    );
  });

  it("can go up and to the right", () => {
    const input = {
      actors: ["keith"],
      keys: [],

      scenarios: [
        {
          id: '0',
          name: '0',
          input: {},

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: 1, y: -1 }
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {
      frames: 1
    });

    assert.deepEqual(
      simulationResult["keith"],
      input.scenarios[0].actors.keith[1].position
    );
  });

  it("can go down and to the left", () => {
    const input = {
      actors: ["keith"],
      keys: [],
      scenarios: [
        {
          id: '0',
          name: '0',
          input: {},

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: -1, y: 1 }
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {
      frames: 1
    });

    assert.deepEqual(
      simulationResult["keith"],
      input.scenarios[0].actors.keith[1].position
    );
  });

  it("responds to input", () => {
    const input = {
      actors: ["keith"],

      keys: ["Right"],

      scenarios: [
        {
          id: '0',
          name: '0',
          input: {
            1: [{ type: "keydown", key: "Right" }]
          },

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: 0, y: 0 }
              },
              {
                frame: 2,
                position: { x: 1, y: 0 }
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {
      frames: 2
    });

    assert.deepEqual(
      simulationResult["keith"],
      input.scenarios[0].actors.keith[2].position
    );
  });

  it("handles multiple scenarios", () => {
    const input = {
      actors: ["keith"],

      keys: ["Right", "Left"],

      scenarios: [
        {
          id: '0',
          name: '0',
          input: {
            1: [{ type: "keydown", key: "Right" }]
          },

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: 0, y: 0 }
              },
              {
                frame: 2,
                position: { x: 1, y: 0 }
              }
            ]
          }
        },
        {
          id: '1',
          name: '0',
          input: {
            1: [{ type: "keydown", key: "Left" }]
          },

          actors: {
            keith: [
              {
                frame: 0,
                position: { x: 0, y: 0 }
              },
              {
                frame: 1,
                position: { x: 0, y: 0 }
              },
              {
                frame: 2,
                position: { x: -1, y: 0 }
              }
            ]
          }
        }
      ]
    };

    const seed = 43;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {
      frames: 2
    });

    assert.deepEqual(
      simulationResult["keith"],
      input.scenarios[0].actors.keith[2].position
    );

    const simulationResult2 = simulate(input, input.scenarios[1], output, {
      frames: 2
    });

    assert.deepEqual(
      simulationResult2["keith"],
      input.scenarios[1].actors.keith[2].position
    );
  });
});
