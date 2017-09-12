import * as assert from 'assert';

import { UserInput } from '../src/index';
import { inputEventsToRanges } from '../src/input-events-to-ranges';

describe('inputEventsToRanges', () => {
  it('converts input events to time ranges', () => {
    const input: UserInput = {
      10: [
        {type: 'keydown', key: 'w'}
      ],

      30: [
        {type: 'keyup', key: 'w'}
      ]
    }

    const expected = {
      'w': [
        {from: 10, to: 30}
      ]
    }

    assert.deepEqual(inputEventsToRanges(input, ['w']), expected);
  });

  it('works with multiple keys', () => {
    const input: UserInput = {
      10: [
        {type: 'keydown', key: 'w'}
      ],

      20: [
        {type: 'keydown', key: 'a'}
      ],

      30: [
        {type: 'keyup', key: 'w'}
      ],

      40: [
        {type: 'keyup', key: 'a'}
      ]
    }

    const expected = {
      'w': [
        {from: 10, to: 30}
      ],

      'a': [
        {from: 20, to: 40}
      ],

      's': [],

      'd': []
    }

    assert.deepEqual(inputEventsToRanges(input, ['w', 'a', 's', 'd']), expected);
  });
});
