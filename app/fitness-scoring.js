const _ = require('lodash');
const Entity = require('./entity');
const simulateWorld = require('./simulator');

function fitness (expectedPosition, entity) {
  var distance = {
    x: Math.abs(expectedPosition.x - entity.x),
    y: Math.abs(expectedPosition.y - entity.y)
  };

  return 1000 - (distance.x + distance.y);
}

function limitTo (limit, number) {
  return _.max([limit, number]);
}

function weightedAverage (scoresPerScenario) {
  return Math.sqrt(_.sum(scoresPerScenario.map(score => Math.pow(limitTo(0, score), 2))) / scoresPerScenario.length);
}

function boilDownIndividualScore (individual, participant, fitnesses) {
  return weightedAverage(
    _.values(fitnesses[participant][individual])
      .map(scoresForScenario => weightedAverage(scoresForScenario))
  );
}

function scoreScenario (scenario, fitnesses, individuals) {
  scenario.participants.forEach(participant => {
    scoreParticipantOnScenario(scenario, participant, fitnesses, individuals[participant]);
  });
}

function scoreParticipantOnScenario (scenario, participant, fitnesses, individuals) {
  individuals.forEach(individual => {
    scoreIndividualOnScenario(scenario, participant, individual, fitnesses);
  });
}

function scoreIndividualOnScenario (scenario, participant, individual, fitnesses) {
  // This is where we call up a variant on the original simulation code
  // Note that exactly one participant is allowed to vary at each point
  var currentFrame = 0;

  if (fitnesses[participant][individual] === undefined) {
    fitnesses[participant][individual] = {};
  };

  fitnesses[participant][individual][scenario.id] = [];

  var entities = scenario.participants.map(participantForEntity => {
    var initial = scenario.initialPositions[participantForEntity];
    var expectedPositions = scenario.expectedPositions[participantForEntity] || [];

    if (participantForEntity === participant) {
      return new Entity(individual, initial, expectedPositions, true);
    } else {
      return new Entity([], initial, expectedPositions, false);
    }
  });

  var activeEntity = _.find(entities, 'active');

  scenario.expectedPositions[participant].forEach(expectedPosition => {
    var frameCount = expectedPosition.frame - currentFrame;

    simulateWorld(entities, frameCount, scenario.input, currentFrame);

    currentFrame = expectedPosition.frame;
    var evaluatedFitness = fitness(expectedPosition, activeEntity);

    fitnesses[participant][individual][scenario.id].push(evaluatedFitness);
  });
}

module.exports = {scoreScenario, boilDownIndividualScore};
