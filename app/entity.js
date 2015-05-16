class Entity {
  constructor(individual, startingPosition) {
    this.individual = individual;
    this.x = startingPosition.x;
    this.y = startingPosition.y;
    this.fitnessPerPosition = [];
  }
}

module.exports = Entity;
