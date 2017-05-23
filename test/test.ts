import * as assert from 'assert';
import * as Random from 'random-js';

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

const MAX_SEQUENCE_CHILD_COUNT = 3;
const MAX_SEED = Math.pow(2, 32);
const MIN_SEED = 0;

type Input = {
  keys: string[];
  scenarios: Scenario[];
  actors: string[];
};

type Output = {
  entities: {[key: string]: Entity};
};

type UserInput = {
  [key: number]: InputEvent[]
};

type InputEvent = {
  type: string;
  key: string;
};

type InputState = {
  [key: string]: boolean;
};

type LeafCommandName = 'moveRight' | 'moveLeft' | 'moveUp' | 'moveDown' | 'noop';

type Entity = Tree;

type Tree = Branch | Leaf;

type Branch = Sequence | InputConditional;

type Sequence = {
  type: 'sequence';
  id: string;
  children: Array<Tree>;
};

type InputConditional = {
  type: 'inputConditional';
  key: string;
  id: string;
  children: Array<Tree>;
};

type Leaf = {
  type: LeafCommandName;
  id: string;
};

type Scenario = {
  input: UserInput;
  actors: {[key: string]: ActorFrame[]};
};

type Vector = {
  x: number;
  y: number;
};

type ActorFrame = {
  frame: number;
  position: Vector;
};

type SimulationOptions = {
  frames: number;
  postFrameCallback?: (frame: number, positions: ActorPositions) => void;
};

type ActorPositions = {
  [key: string]: Vector;
};

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

function simulateAndFindErrorLevel (input: Input, entity: Entity, scenario: Scenario, actor: string) {
  const errorLevels: number[] = [];
  const output = {
    entities: {
      [actor]: entity
    }
  };

  const options = {
    frames: scenario.actors[actor].length,

    postFrameCallback: (frame: number, positions: ActorPositions) => {
      const expectedPosition = scenario.actors[actor][frame].position;

      errorLevels.push(distance(expectedPosition, positions[actor]));
    }
  };

  const size = findSize(entity);

  simulate(input, scenario, output, options);

  return (sum(errorLevels) * 1000) + size;
}

function isLeaf (tree: Tree): tree is Leaf {
  return !('children' in tree);
}

function findSize (tree: Tree): number {
  if (isLeaf(tree)) {
    return 1;
  }

  return sum(tree.children.map(findSize));
}

function makeArray<T> (n: number, f: () => T): Array<T> {
  const array: Array<T> = [];

  while (n > 0) {
    array.push(f());

    n--;
  }

  return array;
}

function makeChildren (random: Random, n: number, depth: number): Entity[] {
  return makeArray(n, () =>
    generateEntity(random.integer(MIN_SEED, MAX_SEED), depth + 1)
  );
}

function generateEntity (seed: number, depth = 0): Entity {
  const random = new Random(Random.engines.mt19937().seed(seed));

  const isLeaf = depth > 2 || random.bool();

  if (isLeaf) {
    const possibleCommands = ['moveLeft', 'moveRight', 'moveUp', 'moveDown', 'noop'];

    const command = (random as any).pick(possibleCommands) as LeafCommandName;

    return {
      type: command,
      id: seed.toString()
    };
  } else {
    const possibleCommands = ['sequence', 'inputConditional'];
    // TODO - fix definitely typed definition
    const command = (random as any).pick(possibleCommands) as any;

    if (command === 'inputConditional') {
      const key = (random as any).pick(['Left', 'Right']);

      return {
        type: command,
        key,
        id: seed.toString(),
        children: makeChildren(random, 2, depth)
      };
    }

    return {
      type: command,
      id: seed.toString(),
      children: makeChildren(random, random.integer(2, MAX_SEQUENCE_CHILD_COUNT), depth)
    };
  }
}

// TODO - determinism
function generateEntities (random: Random, generationSize: number): Entity[] {
  const entities = [];

  while (entities.length < generationSize) {
    entities.push(generateEntity(random.integer(MIN_SEED, MAX_SEED)));
  }

  return entities;
}

type BestFitness = {[key: string]: number};
type BestEntities = {[key: string]: {[key2: string]: Entity[]}};

export function helixPi (input: Input, seed: number): Output {
  const generationSize = 500;
  const generationCount = 3000000;
  const random = new Random(Random.engines.mt19937().seed(seed));
  // Given an array of actor names
  // And a collection of scenarios
  let allBestEntities: BestEntities = {};

  for (let actor of input.actors) {
    allBestEntities[actor] = {};
  }

  let generation = 0;
  let bestFitness: BestFitness = {};

  function highestFitness (bestFitness: BestFitness): number {
    if (Object.keys(bestFitness).length === 0) {
      return Infinity;
    }

    return Math.max(...Object.keys(bestFitness).map(key => bestFitness[key]));
  }


  while (generation < generationCount && highestFitness(bestFitness) > 100) {
    // For each scenario
    input.scenarios.forEach((scenario, index) => {
      //  For each actor
      for (let actor of Object.keys(scenario.actors)) {
        //   Generate N possible entities
        const entities = generateEntities(random, generationSize);
        //   Simulate them in this scenario

        //   Assign them each an error level based on how far they are from the desired position at each frame
        const errorLevels: EntityErrorLevels = {};

        for (let entity of entities) {
          errorLevels[entity.id] = simulateAndFindErrorLevel(input, entity, scenario, actor);
        };

        const bestEntities = entities.sort((a, b) => errorLevels[a.id] - errorLevels[b.id]);
        const bestFitnessInGeneration = errorLevels[bestEntities[0].id];

        bestFitness[index] = Math.min(bestFitness[index] || Infinity, bestFitnessInGeneration);

        allBestEntities[actor][index] = allBestEntities[actor][index] || [];

         allBestEntities[actor][index].push(...bestEntities.slice(0, 2));

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
      };
    });

    generation++;
  }
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
  //

  /*
  const errorLevels: EntityErrorLevels = {};

  for (let entity of allBestEntities) {
    errorLevels[entity.id] = sum(input.scenarios.map(scenario =>
      simulateAndFindErrorLevel(input, entity, scenario, 'keith')
    ));
  };

  const superBestEntities = allBestEntities.sort((a, b) => errorLevels[a.id] - errorLevels[b.id]);
   */

  const bestEntities = Object.keys(allBestEntities.keith).map(key => allBestEntities.keith[key][1]);

  const entity = {
    type: 'sequence',
    id: 'nah',
    children: bestEntities
  } as Branch;

  return {
    entities: {
      'keith': entity
    }
  };
}

function executeCode (position: Vector, code: Entity, input: InputState): Vector {
  if (code.type === 'moveRight') {
    return {...position, x: position.x + 1};
  }

  if (code.type === 'moveLeft') {
    return {...position, x: position.x - 1};
  }

  if (code.type === 'moveUp') {
    return {...position, y: position.y - 1};
  }

  if (code.type === 'moveDown') {
    return {...position, y: position.y + 1};
  }

  if (code.type === 'sequence') {
    return code.children.reduce((position, entity) => executeCode(position, entity, input), position);
  }

  if (code.type === 'noop') {
    return position;
  }

  if (code.type === 'inputConditional') {
    if (input[code.key]) {
      return executeCode(position, code.children[0], input);
    } else {
      return executeCode(position, code.children[1], input);
    }
  }

  throw new Error('Unimplemented code: ' + JSON.stringify(code, null, 2));
}

function simulate (input: Input, scenario: Scenario, output: Output, options: SimulationOptions): ActorPositions {
  const actors = Object.keys(scenario.actors);

  const positions: ActorPositions = {};
  const inputState: InputState = {};

  input.keys.forEach(key => inputState[key] = false);

  actors.forEach(actor => {
    positions[actor] = {...scenario.actors[actor][0].position};
  });

  let frames = options.frames;
  let currentFrame = 0;

  while (currentFrame < frames) {
    const inputEvents = scenario.input[currentFrame] || [];

    inputEvents.forEach(event => {
      if (event.type === 'keydown') {
        inputState[event.key] = true;
      } else {
        inputState[event.key] = false;
      }
    });

    if (options.postFrameCallback) {
      options.postFrameCallback(currentFrame, positions);
    }

    actors.forEach(actor => {
      positions[actor] = executeCode(positions[actor], output.entities[actor], inputState);
    });

    currentFrame++;
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
      keys: [],

      scenarios: [
        {
          input: {},

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

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 1});

    assert.deepEqual(simulationResult['keith'], {x: 1, y: 0});
  });

  it('can go left', () => {
    const input = {
      actors: ['keith'],
      keys: [],

      scenarios: [
        {
          input: {},

          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: -1, y: 0}
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 1});

    assert.deepEqual(simulationResult['keith'], input.scenarios[0].actors.keith[1].position);
  });

  it('can go up and to the right', () => {
    const input = {
      actors: ['keith'],
      keys: [],

      scenarios: [
        {
          input: {},

          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: 1, y: -1}
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 1});

    assert.deepEqual(simulationResult['keith'], input.scenarios[0].actors.keith[1].position);
  });

  it('can go down and to the left', () => {
    const input = {
      actors: ['keith'],
      keys: [],
      scenarios: [
        {
          input: {},

          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: -1, y: 1}
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 1});

    assert.deepEqual(simulationResult['keith'], input.scenarios[0].actors.keith[1].position);
  });

  it('responds to input', () => {
    const input = {
      actors: ['keith'],

      keys: [
        'Right'
      ],

      scenarios: [
        {
          input: {
            1: [{type: 'keydown', key: 'Right'}]
          },

          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: 0, y: 0}
              },
              {
                frame: 2,
                position: {x: 1, y: 0}
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 2});

    assert.deepEqual(simulationResult['keith'], input.scenarios[0].actors.keith[2].position);
  });

  it('handles multiple scenarios', () => {
    const input = {
      actors: ['keith'],

      keys: [
        'Right',
        'Left'
      ],

      scenarios: [
        {
          input: {
            1: [{type: 'keydown', key: 'Right'}]
          },

          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: 0, y: 0}
              },
              {
                frame: 2,
                position: {x: 1, y: 0}
              }
            ]
          }
        },
        {
          input: {
            1: [{type: 'keydown', key: 'Left'}]
          },

          actors: {
            'keith': [
              {
                frame: 0,
                position: {x: 0, y: 0}
              },
              {
                frame: 1,
                position: {x: 0, y: 0}
              },
              {
                frame: 2,
                position: {x: -1, y: 0}
              }
            ]
          }
        }
      ]
    };

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 2});

    assert.deepEqual(simulationResult['keith'], input.scenarios[0].actors.keith[2].position);

    const simulationResult2 = simulate(input, input.scenarios[1], output, {frames: 2});

    assert.deepEqual(simulationResult2['keith'], input.scenarios[1].actors.keith[2].position);
  });
});
