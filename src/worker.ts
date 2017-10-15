import {helixPi, Output} from './index';

let previousOutput : Output | null = null;

module.exports = function(self: Worker) {
  self.onmessage = function (ev: MessageEvent) {
    const args = JSON.parse(ev.data);

    previousOutput = args.results;

    console.log('input', args);

    const output = helixPi(args.input, Math.random() * 10000, previousOutput);

    console.log('output', output);

    self.postMessage(JSON.stringify(output));
  };
}
