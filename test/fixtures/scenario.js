
function createScenario() {
  return {
    id: 1,
    participants: ['Nick'],

    initialPositions: {
      Nick: {x: 0, y: 0}
    },

    expectedPositions: {
      Nick: [
        {
          frame: 10,
          x: 100,
          y: 0
        }
      ]
    }
  }
}
module.exports = createScenario;
