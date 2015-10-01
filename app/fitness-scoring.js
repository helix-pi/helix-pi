const _ = require('lodash');
const Entity = require('./entity');
const simulateWorld = require('./simulator');

require('../lib/map-extensions'); // To the reader, my apologies

const MAX_FITNESS = 1000;

function mean (items) {
  return _.sum(items) / items.length;
}

function fitness (expectedPosition, entity) {
  const distance = {
    x: Math.abs(expectedPosition.x - entity.x),
    y: Math.abs(expectedPosition.y - entity.y)
  };

  return MAX_FITNESS - Math.sqrt(Math.pow(distance.x, 2) + Math.pow(distance.y, 2));
}

function limitTo (limit, number) {
  return _.max([limit, number]);
}

function meanOfSquares (numbers) {
  return Math.sqrt(mean(numbers.map(number => Math.pow(limitTo(0, number), 2))));
}

function weightedAverage (scoresPerScenario) {
  return {
    score: mean(scoresPerScenario.valuesArray().map(score => score.score)),
    weightedScore: meanOfSquares(scoresPerScenario.valuesArray().map(score => score.weightedScore))
  };
}

function participantInScenario (participant) {
  return (fitnesses, scenario) => {
    return scenario.participants.findIndex(participantKey =>
      participantKey === participant
    ) !== -1;
  };
}

function boilDownIndividualScore (individual, participant, fitnesses, scenarioImportances) {
  if (fitnesses.filter(participantInScenario(participant)).size === 0) {
    return {
      score: 0,
      weightedScore: 0
    };
  }

  return weightedAverage(
    fitnesses
      .filter(participantInScenario(participant))
      .map(fitnessesForScenario => fitnessesForScenario[participant].get(individual))
      .map(meanOfSquares)
      .map((scoreForScenario, scenario) => {
        return {
          score: scoreForScenario,
          weightedScore: scoreForScenario * scenarioImportances[participant][scenario.id]
        };
      }
    )
  );
}

function scoreScenarios (scenarios, individuals) {
  return scenarios.map(scenario => {
    return [scenario, scoreScenario(scenario, individuals)];
  }).reduce((allScenarioScores, score) => {
    const [scenario, scenarioScores] = score;
    return allScenarioScores.set(scenario, scenarioScores);
  }, new Map());
}

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

  if (individual.positions === undefined) {
    individual.positions = {};
  }

  individual.positions[scenario.id] = [[activeEntity.x, activeEntity.y]];

  return scenario.expectedPositions[participant].map(expectedPosition => {
    var frameCount = expectedPosition.frame - currentFrame;

    simulateWorld(entities, frameCount, scenario.input, currentFrame);
    individual.positions[scenario.id].push([activeEntity.x, activeEntity.y]);

    currentFrame = expectedPosition.frame;
    return fitness(expectedPosition, activeEntity);
  });
}
module.exports = {scoreScenarios, boilDownIndividualScore};
