const _ = require('lodash');
const Entity = require('./entity');
const simulateWorld = require('./simulator');

const MAX_FITNESS = 1000;

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
  return Math.sqrt(_.sum(numbers.map(number => Math.pow(limitTo(0, number), 2)))) / numbers.length;
}

function log (a) { console.log(a); return a };

function weightedAverage (scoresPerScenario) {
  return {
    score: meanOfSquares(scoresPerScenario.valuesArray().map(score => score.score)),
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

Map.prototype.map = function (f) {
  const resultingMap = new Map();

  this.forEach((value, key) => {
    resultingMap.set(key, f(value, key));
  });

  return resultingMap;
};

Map.prototype.filter = function (f) {
  const resultingMap = new Map();

  this.forEach((value, key) => {
    if (f(value, key)) {
      resultingMap.set(key, value);
    };
  });

  return resultingMap;
};

Map.prototype.valuesArray = function () {
  const values = [];

  for(let value of this.values()) {
    values.push(value);
  }

  return values;
};

Map.prototype.log = function () {
  const entries = {};
  for(let [key, value] of this.entries()) {
    entries[key] = value;
  };

  console.log(entries);

  return this;
}

function boilDownIndividualScore (individual, participant, fitnesses, scenarioImportances) {
  if (fitnesses.filter(participantInScenario(participant)).size === 0) {
    return {
      score: 0,
      weightedScore: 0
    }
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
    })
  );
}

function scoreScenarios (scenarios, individuals) {
  return scenarios.map(scenario => {
    return [scenario, scoreScenario(scenario, individuals)];
  }).reduce((allScenarioScores, score) => {
    const [scenario, scenarioScores] = score;
    return allScenarioScores.set(scenario, scenarioScores);
  }, new Map());
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

function createScenarioImportances (fitnessForParticipantPerScenario) {
  return Object.keys(fitnessForParticipantPerScenario)
    .map(participant => ({participant, fitnesses: fitnessForParticipantPerScenario[participant]}))
    .map(({participant, fitnesses}) => ({[participant]: calculateImportance(fitnesses)}))
    .reduce((importances, importance) => Object.assign(importances, importance), {});
};

function calculateImportance (fitnesses) {
  return Object.keys(fitnesses)
    .map(scenarioId => ({scenarioId, fitness: fitnesses[scenarioId]}))
    .map(({scenarioId, fitness}) => ({[scenarioId]: MAX_FITNESS / fitness}))
    .reduce((importance, scenarioImportance) => Object.assign(importance, scenarioImportance), {});
};

module.exports = {scoreScenarios, boilDownIndividualScore, createScenarioImportances};
