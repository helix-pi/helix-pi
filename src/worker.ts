import {helixPi, Output} from './index';

let previousOutput : Output | null = null;

module.exports = function(self: Worker) {
  self.onmessage = function (ev: MessageEvent) {
    const input = JSON.parse(ev.data);

    console.log('input', input);

    console.log(previousOutput);
    const output = helixPi(input, Math.random() * 10000, previousOutput);

    previousOutput = output;

    console.log('output', output);

    self.postMessage(JSON.stringify(output));
  };
}
