import * as assert from "assert";

import { tumbler, Entity, Scenario } from "../src";

describe("tumbler", () => {
  it("removes dead code", () => {
    const code: Entity = {
      type: "inputConditional",
      key: "d",
      id: "6",
      children: [
        {
          type: "collisionConditional",
          id: "3525339798",
          children: [
            {
              type: "setVelocity",
              id: "2947694081",
              velocity: {
                x: -0.05,
                y: -0.8
              }
            },
            {
              type: "noop",
              id: "1486161105"
            }
          ]
        },
        {
          type: "inputConditional",
          key: "w",
          id: "177841122",
          children: [
            {
              type: "noop",
              id: "3016928855"
            },
            {
              type: "noop",
              id: "3520546348"
            }
          ]
        }
      ]
    };

    const expected = {
      type: "inputConditional",
      key: "d",
      id: "6",
      children: [
        {
          type: "collisionConditional",
          id: "3525339798",
          children: [
            {
              type: "setVelocity",
              id: "2947694081",
              velocity: {
                x: -0.05,
                y: -0.8
              }
            },
            {
              type: "noop",
              id: "1486161105"
            }
          ]
        },
        {
          type: "noop",
          id: "tumbler-refactor"
        }
      ]
    };

    assert.deepEqual(tumbler(code), expected);
  });

  it("removes deeply nested noops", () => {
    const code: Entity = {
      type: "sequence",
      id: "0",
      children: [
        {
          type: "sequence",
          id: "1",
          children: [
            {
              type: "noop",
              id: "2"
            }
          ]
        }
      ]
    };

    const expected = {
      type: "noop",
      id: "tumbler-refactor"
    };

    assert.deepEqual(tumbler(code), expected);
  });

  it("removes nested sequences", () => {
    const code: Entity = {
      type: "sequence",
      id: "0",
      children: [
        {
          type: "sequence",
          id: "1",
          children: [
            {
              type: "sequence",
              id: "1",
              children: [
                {
                  type: "setVelocity",
                  id: "2947694081",
                  velocity: {
                    x: -0.05,
                    y: -0.8
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const expected = {
      type: "sequence",
      id: "tumbler-flatten",
      children: [
        {
          type: "setVelocity",
          id: "2947694081",
          velocity: {
            x: -0.05,
            y: -0.8
          }
        }
      ]
    };

    assert.deepEqual(tumbler(code), expected);
  });

  it("removes code that does not improve the individual's fitness", () => {
    const scenario: Scenario = {
      name: "moves right",
      id: "lol",
      input: {},
      actors: {
        kevin: [
          { frame: 0, position: { x: 0, y: 0 } },
          { frame: 1, position: { x: 1, y: 0 } }
        ]
      }
    };

    const code: Entity = {
      type: "sequence",
      id: "0",
      children: [
        {
          type: "move",
          id: "1",
          amount: 1,
          direction: "right"
        },
        {
          type: "move",
          id: "2",
          amount: 0.1,
          direction: "up"
        }
      ]
    };

    const input = {
      actors: {
        kevin: {
          id: "kev",
          name: "kevin",
          width: 50,
          height: 50,
          color: "white"
        }
      },
      scenarios: [scenario],
      keys: []
    };

    const tumbled = tumbler(code, [scenario], input, "kevin");

    assert.deepEqual(tumbled, {
      type: "sequence",
      id: "0",
      children: [
        {
          type: "move",
          id: "1",
          amount: 1,
          direction: "right"
        }
      ]
    });
  });
});
