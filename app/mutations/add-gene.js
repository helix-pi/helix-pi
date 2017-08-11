const getRandomInt = require('../../lib/get-random-int');
const Gene = require('../gene');
const createApi = require('../api');

function createStub () { return function stub () { throw 'you no execute me'; }; }

const stubApi = createApi({
  checkCollision: createStub(),
  checkButtonDown: createStub(),
  checkButtonReleased: createStub()
});

function addGene (individual) {
  const newIndividual = individual.slice();

  const indexToInsertNewGene = getRandomInt(0, individual.length);

  const newGene = Gene(stubApi);

  newIndividual.splice(indexToInsertNewGene, 0, newGene);

  return newIndividual;
}

module.exports = addGene;
