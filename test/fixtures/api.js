const createApi = require('../../app/api');

function createStub () { return function stub () { throw 'you no execute me'; }; }

function createTestApi () {
  return createApi({
    checkCollision: createStub(),
    checkButtonDown: createStub(),
    checkButtonReleased: createStub()
  });
}

module.exports = createTestApi;
