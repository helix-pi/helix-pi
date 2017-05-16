import * as assert from 'assert';

// What was wrong with the historic helix pi codebase?
//
// It was nondeterministic, tests would occasionally fail.
// In production the quality of entities would regress because of hard to squash shared mutable reference bugs.
// It serialized closures as a means of transporting code rather than using a real ast
// It was pretty slow
//
// How can we do this better?
//
// Write a deterministic codebase. Random is necessary, but should be injected and controlled.
// Drive development with tests. If you can write a test to add a feature, you can write a test to fix a bug. Shorter feedback loop.
// Avoid any mutation to begin with. Write that immutable helper library you've been dreaming of.
// Introduce controlled and reasoned mutation as optimization after benchmarking.
// Represent programs as a serialisable object. Write functions that run them, or compile them to be run.
// Benchmark and optimise.
// Have consistent terminology
//
// Scenarios describe actors changing state in response to input and time
// Actors represent behaviours attached to an image in a scene
// Helix pi takes a collection of scenarios and returns entities that behave as the actors do
// Entities are an ast of code that behaves a certain way in response to input and time

type Input = {
  scenarios: Scenario[];
  actors: string[];
}

type Output = {
  entities: {[key: string]: Entity};
}

type Entity = {
  type: 'moveRight',
  id: string
}

type Scenario = {
  actors: {[key: string]: ActorFrame[]};
}

type Vector = {
  x: number;
  y: number;
}

type ActorFrame = {
  frame: number;
  position: Vector;
}

type SimulationOptions = {
  frames: number;
}

type ActorPositions = {
  [key: string]: Vector;
}

type EntityErrorLevels = {
  [key: string]: number;
};

function distance (a: Vector, b: Vector): number {
  return Math.abs(
    Math.sqrt(
      Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2)
    )
  );
}

function add (a: number, b: number): number {
  return a + b;
}

function sum (array: number[]): number {
  return array.reduce(add, 0);
}

function simulateAndFindErrorLevel (entity: Entity, frames: ActorFrame[]) {;
  const startingPosition = frames[0].position;
  const errorLevels : number[] = [];

  frames.slice(1).reduce((position, frame) => {
    const updatedPosition = executeCode(entity, position);

    errorLevels.push(distance(updatedPosition, frame.position));

    return updatedPosition;
  }, startingPosition);

  return sum(errorLevels);
}

function generateEntity (seed: number): Entity {
  return {
    type: 'moveRight',
    id: seed.toString()
  }
}

// TODO - determinism
function generateEntities (generationSize: number): Entity[] {
  const entities = [];

  while (entities.length < generationSize) {
    entities.push(generateEntity(Math.random()));
  }

  return entities;
}

function helixPi (input: Input): Output {
  const generationSize = 500;
  // Given an array of actor names
  // And a collection of scenarios

  let foo : Entity | undefined = undefined;
  // For each scenario
  input.scenarios.forEach(scenario => {
    //  For each actor
    Object.keys(scenario.actors).forEach(actor => {
      //   Generate N possible entities
      const entities = generateEntities(generationSize);
      //   Simulate them in this scenario

      //   Assign them each an error level based on how far they are from the desired position at each frame
      const errorLevels : EntityErrorLevels = {};

      entities.forEach(entity => {
        errorLevels[entity.id] = simulateAndFindErrorLevel(entity, scenario.actors[actor]);
      });

      foo = entities[0];

      //   Breed the best entities, selecting proportionally weighted to their error level
      //     Where breeding is defined as
      //       Given two entities
      //       Pick a location in each of their code trees
      //       Swap the nodes at those positions
      //       For some random inviduals, pick a node to mutate and then change it
      //
      //   Return a collection of entities composed of
      //     the best entities from the previous
      //     the bred children
      //
      //   Repeat until an entity with a near zero error level is found
      //       or until we hit a maximum number of generations
      //
    });
  });
  // Given all of the best entities for each scenario
  // We want to breed entities that are the best at all scenarios
  //
  // Generate N possible entities + best entities from all scenarios
  //
  // Simulate them in each scenario
  //
  // Assign them an error level based on the error level for each scenario
  //   Cumulative might work
  //
  // Breed them, following the above process
  //
  // Repeat this process until ideal entities are found for each actor
  //  Or the max generations count is hit


  if (foo) {
    return {
      entities: {
        'keith': foo
      }
    }
  }

  return {
    entities: {
    }
  }
}

function executeCode (code: Entity, position: Vector) {
  if (code.type === 'moveRight') {
    return {...position, x: position.x + 1};
  }

  throw new Error('Unimplemented code: ' + JSON.stringify(code, null, 2));
}

function simulate (scenario: Scenario, output: Output, options: SimulationOptions): ActorPositions {
  const actors = Object.keys(scenario.actors);

  const positions : ActorPositions = {};

  actors.forEach(actor => {
    positions[actor] = scenario.actors[actor][0].position;
  });

  let frames = options.frames;

  while (frames > 0) {
    actors.forEach(actor => {
      positions[actor] = executeCode(output.entities[actor], positions[actor]);
    });

    frames--;
  }

  return positions;
}

describe('Helix Pi', () => {
  it('takes a collection of scenarios and returns a data structure representing code that when executed fulfills the scenario', () => {
    // describe the most basic scenario
    // call helix pi
    // simulate the behaviour of the returned entities
    // check if they match the described behaviour of the actors in the scenario
    const input = {
      actors: ['keith'],

      scenarios: [
        {
          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: 1, y: 0}
              }
            ]
          }
        }
      ]
    };

    const output = helixPi(input);

    const simulationResult = simulate(input.scenarios[0], output, {frames: 1});

    assert.deepEqual(simulationResult['keith'], {x: 1, y: 0});
  });
});
