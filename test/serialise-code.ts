import * as assert from "assert";
import { codeToString } from '../src/code-to-string';

import { Entity } from '../src/index';

describe("codeToString", () => {
  it("turns a code tree into a string", () => {
    const code: Entity = {
      type: "sequence",
      id: "nah",
      children: [
        {
          type: "inputConditional",
          key: "w",
          id: "1912010071",
          children: [
            {
              type: "move",
              amount: 1,
              direction: "up",
              id: "307983014"
            },
            {
              type: "noop",
              id: "3454788831"
            }
          ]
        }
      ]
    };

    assert.equal(
      codeToString(code).trim(),
      `
if keyDown("w") {
  move(up, 1)
}`.trim()
    );
  });

  it("turns a code tree into a string", () => {
    const code: Entity = {
      type: "sequence",
      id: "nah",
      children: [
        {
          type: "inputConditional",
          key: "w",
          id: "1912010071",
          children: [
            {
              type: "move",
              amount: 1,
              direction: "up",
              id: "307983014"
            },
            {
              type: "move",
              amount: 1,
              direction: "down",
              id: "307983014"
            },
          ]
        }
      ]
    };

    assert.equal(
      codeToString(code).trim(),
      `
if keyDown("w") {
  move(up, 1)
} else {
  move(down, 1)
}`.trim()
    );
  });
});
