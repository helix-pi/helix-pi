const reduceIntoObject = require('./reduce-into-object');
const _ = require('lodash');

// TODO - DUPLICATION OMG
const MAX_FITNESS = 1000;

function mean (numbers) {
  const result = _.sum(numbers) / numbers.length;

  if (result === Infinity) {
    return 0;
  }

  return result;
}

function highestFitnessForScenario (fitnessesForScenario) {
  return _.max(
    fitnessesForScenario
      .valuesArray()
      .map(fitnesses => mean(fitnesses))
  );
}

function highestFitnessForParticipantPerScenario (participant, fitnesses) {
  return reduceIntoObject(
    fitnesses.map((scenarioFitnesses, scenario) => {
      if (scenarioFitnesses[participant] === undefined) {
        return {[scenario.id]: 0};
      }

      return {
        [scenario.id]: highestFitnessForScenario(scenarioFitnesses[participant])
      };
    }).valuesArray()
  );
};

function getHighestFitnessesForScenarioForParticipant (participants, fitnesses) {
  return reduceIntoObject(participants.map(participant => {
    return {
      [participant]: highestFitnessForParticipantPerScenario(
        participant,
        fitnesses
      )
    };
  }));
};

function createScenarioImportances (fitnessForParticipantPerScenario) {
  return Object.keys(fitnessForParticipantPerScenario)
    .map(participant => ({participant, fitnesses: fitnessForParticipantPerScenario[participant]}))
    .map(({participant, fitnesses}) => ({[participant]: calculateImportance(fitnesses)}))
    .reduce((importances, importance) => Object.assign(importances, importance), {});
};

function replaceInfinityWithZero (number) {
  if (number === Infinity) {
    return 0;
  }

  return number;
}

function calculateImportance (fitnesses) {
  return Object.keys(fitnesses)
    .map(scenarioId => ({scenarioId, fitness: fitnesses[scenarioId]}))
    .map(({scenarioId, fitness}) => ({[scenarioId]: replaceInfinityWithZero(MAX_FITNESS / fitness)}))
    .reduce((importance, scenarioImportance) => Object.assign(importance, scenarioImportance), {});
};


function calculateScenarioImportances (participants, fitnesses) {
  return createScenarioImportances(
    getHighestFitnessesForScenarioForParticipant(participants, fitnesses)
  );
}

module.exports = calculateScenarioImportances;

