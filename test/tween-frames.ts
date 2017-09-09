import * as assert from "assert";
import { tweenFrames } from "../src/tween-frames";

describe("tweenFrames", () => {
  it("fills in the gaps", () => {
    const frames = [
      { frame: 0, position: { x: 100, y: 100 } },
      { frame: 5, position: { x: 200, y: 200 } }
    ];

    assert.deepEqual(tweenFrames(frames), [
      { frame: 0, position: { x: 100, y: 100 } },
      { frame: 1, position: { x: 120, y: 120 } },
      { frame: 2, position: { x: 140, y: 140 } },
      { frame: 3, position: { x: 160, y: 160 } },
      { frame: 4, position: { x: 180, y: 180 } },
      { frame: 5, position: { x: 200, y: 200 } }
    ]);
  });

  it("fills multiple gaps", () => {
    const frames = [
      { frame: 0, position: { x: 100, y: 100 } },
      { frame: 5, position: { x: 200, y: 200 } },
      { frame: 10, position: { x: 100, y: 100 } }
    ];

    assert.deepEqual(tweenFrames(frames), [
      { frame: 0, position: { x: 100, y: 100 } },
      { frame: 1, position: { x: 120, y: 120 } },
      { frame: 2, position: { x: 140, y: 140 } },
      { frame: 3, position: { x: 160, y: 160 } },
      { frame: 4, position: { x: 180, y: 180 } },
      { frame: 5, position: { x: 200, y: 200 } },
      { frame: 6, position: { x: 180, y: 180 } },
      { frame: 7, position: { x: 160, y: 160 } },
      { frame: 8, position: { x: 140, y: 140 } },
      { frame: 9, position: { x: 120, y: 120 } },
      { frame: 10, position: { x: 100, y: 100 } }
    ]);
  });
});
