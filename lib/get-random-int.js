let getRandomFloat = require('./get-random-float');

function getRandomInt (min, max) {
  return Math.floor(getRandomFloat(min, max));
}

module.exports = getRandomInt;
