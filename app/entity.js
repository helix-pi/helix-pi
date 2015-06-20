class Entity {
  constructor (individual, startingPosition, expectedPositions = [], active = false) {
    this.individual = individual;
    this.x = startingPosition.x;
    this.y = startingPosition.y;
    this.fitnessPerPosition = [];
    this.positions = [startingPosition].concat(expectedPositions);
  }

  moveToFrame (frame) {
    // this code was copied from the editor, and changed to use frames instead of ratios
    // TODO - extract to a common repo
    var lerp = function (startPosition, endPosition, ratio) {
      return {
        x: startPosition.x + (endPosition.x - startPosition.x) * ratio,
        y: startPosition.y + (endPosition.y - startPosition.y) * ratio
      };
    };

    var firstPosition = _.first(this.positions);

    var that = this;
    var getPositionAt = function (positions, frameToFind) {
      var totalFrames = _.last(this.positions).frame;

      if (frameToFind > totalFrames) {
        return false;
      }

      // ugh a for loop
      // TODO - make this functional and nice
      for (var positionIndex = 0; positionIndex < positions.length; positionIndex++) {
        var position = positions[positionIndex];
        var nextPosition = positions[positionIndex + 1];

        if (nextPosition === undefined) {
          continue;
        }

        if (frameToFind >= position.frame && frameToFind < nextPosition.frame) {
          // if you read this code I am a bit sorry
          var startPositionRatio = position.frame / totalFrames;
          var nextPositionRatio = nextPosition.frame / totalFrames;

          var duration = nextPositionRatio - startPositionRatio;

          return lerp(position, nextPosition, (ratio - startPositionRatio) / duration);
        }
      }

      return false;
    };

    var newPosition = getPositionAt(this.positions, frame);

    // TODO - make entity centered
    if (newPosition) {
      this.x = newPosition.x;
      this.y = newPosition.y;
    }
  }
}

module.exports = Entity;
