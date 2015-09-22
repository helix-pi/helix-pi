/* globals describe, it */

const Gene = require('../app/gene');
const api = require('./fixtures/api')();

const assert = require('assert');

describe('Gene', () => {
  it('is a function', () => {
    assert.equal(typeof Gene(api), 'function');
  });
});
