function getRandomFloat (min, max) {
  return (Math.random() * (max - min)) + min;
}

module.exports = getRandomFloat;
