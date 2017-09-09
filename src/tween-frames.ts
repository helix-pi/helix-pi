import { ActorFrame } from "./index";
import { add, multiply, subtract, divide } from "./vector";

export function tweenFrames(frames: ActorFrame[]): ActorFrame[] {
  const newFrames = [];

  let previousFrame = { frame: -1, position: { x: 0, y: 0 } };

  for (let frame of frames.filter(Boolean)) {
    if (frame.frame === previousFrame.frame + 1) {
      newFrames.push(frame);

      previousFrame = frame;
    } else {
      const missingFrames = frame.frame - previousFrame.frame - 1;

      const difference = subtract(frame.position, previousFrame.position);

      const perFrameDifference = divide(difference, missingFrames + 1); // ugh

      for (let i = 1; i <= missingFrames; i++) {
        newFrames.push({
          frame: previousFrame.frame + i,
          position: add(previousFrame.position, multiply(perFrameDifference, i))
        });
      }

      newFrames.push(frame);

      previousFrame = frame;
    }
  }

  return newFrames;
}
