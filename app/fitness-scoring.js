const _ = require('lodash');
const Entity = require('./entity');
const simulateWorld = require('./simulator');

function fitness (expectedPosition, entity) {
  var distance = {
    x: Math.abs(expectedPosition.x - entity.x),
    y: Math.abs(expectedPosition.y - entity.y)
  };

  return 1000 - Math.sqrt(Math.pow(distance.x, 2) + Math.pow(distance.y, 2));
}

function limitTo (limit, number) {
  return _.max([limit, number]);
}

function weightedAverage (scoresPerScenario) {
  return Math.sqrt(_.sum(scoresPerScenario.map(score => Math.pow(limitTo(0, score), 2))) / scoresPerScenario.length);
}

function participantInScenario (participant) {
  return (scenario) => {
    return Object.keys(scenario).findIndex(participantKey =>
      participantKey === participant
    ) !== -1;
  };
}

function boilDownIndividualScore (individual, participant, fitnesses) {
  return weightedAverage(
    _.values(fitnesses)
      .filter(participantInScenario(participant))
      .map(fitnessesForScenario => fitnessesForScenario[participant].get(individual))
  );
}

function scoreScenarios (scenarios, individuals) {
  return scenarios.map(scenario => {
    return { [scenario.id]: scoreScenario(scenario, individuals) };
  }).reduce((scenarioScores, score) =>
    Object.assign(scenarioScores, score), {}
  );
};

function scoreScenario (scenario, individuals) {
  return scenario.participants.map(participant => {
    return {
      [participant]: scoreParticipantOnScenario(scenario, participant, individuals[participant])
    };
  }).reduce((fitnesses, participantFitnesses) => Object.assign(fitnesses, participantFitnesses), {});
}

function scoreParticipantOnScenario (scenario, participant, individuals) {
  return individuals.map(individual => {
    return [individual, scoreIndividualOnScenario(scenario, participant, individual)];
  }).reduce((scenarioScores, individualAndScores) => {
    const [individual, scores] = individualAndScores;
    return scenarioScores.set(individual, scores);
  }, new Map());
}

function scoreIndividualOnScenario (scenario, participant, individual) {
  // This is where we call up a variant on the original simulation code
  // Note that exactly one participant is allowed to vary at each point
  var currentFrame = 0;

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

  return scenario.expectedPositions[participant].map(expectedPosition => {
    var frameCount = expectedPosition.frame - currentFrame;

    simulateWorld(entities, frameCount, scenario.input, currentFrame);

    currentFrame = expectedPosition.frame;
    return fitness(expectedPosition, activeEntity);
  });
}

module.exports = {scoreScenarios, boilDownIndividualScore};
