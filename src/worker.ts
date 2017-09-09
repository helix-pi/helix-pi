import {helixPi} from './index';

module.exports = function(self: Worker) {
  self.onmessage = function (ev: MessageEvent) {
    const input = JSON.parse(ev.data);

    console.log('input', input);

    const output = helixPi(input, Math.random());

    console.log('output', output);

    self.postMessage(JSON.stringify(output));
  };
}
