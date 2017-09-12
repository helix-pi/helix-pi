import { UserInput } from './index';

export interface InputRange {
  from: number;
  to: number;
}

export interface InputRanges {
  [key: string]: InputRange[]
}

export function inputEventsToRanges (input: UserInput, keys: string[]): InputRanges {
  const output: InputRanges = {}
  const inputStart: any = {};

  for (let key of keys) {
    output[key] = [];
  }

  const frames = Object.keys(input).map(frame => parseInt(frame, 10)).sort((a, b) => a - b);

  for (let frame of frames) {
    for (let inputEvent of input[frame]) {
      if (inputEvent.type === 'keydown') {
        inputStart[inputEvent.key] = frame;
      }

      if (inputEvent.type === 'keyup') {
        output[inputEvent.key].push({from: inputStart[inputEvent.key], to: frame});
      }
    }
  }

  return output;
}
