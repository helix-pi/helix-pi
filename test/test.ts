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
  input: UserInput;
  keys: string[];
  scenarios: Scenario[];
  actors: string[];
};

type Output = {
  entities: {[key: string]: Entity};
};

type UserInput = {
  [key: number]: InputEvent[]
}

type InputEvent = {
  type: string;
  key: string;
}

type InputState = {
  [key: string]: boolean;
}

type LeafCommandName = 'moveRight' | 'moveLeft' | 'moveUp' | 'moveDown';

type Entity = Tree;

type Tree = Branch | Leaf;

type Branch = Sequence | InputConditional;

type Sequence = {
  type: 'sequence';
  id: string;
  children: Array<Tree>;
}

type InputConditional = {
  type: 'inputConditional';
  id: string;
  children: Array<Tree>;
  key: string;
}

type Leaf = {
  type: LeafCommandName;
  id: string;
}

type Scenario = {
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
  }

  const options = {
    frames: scenario.actors[actor].length,

    postFrameCallback: (frame: number, positions: ActorPositions) => {
      const expectedPosition = scenario.actors[actor][frame].position;

      errorLevels.push(distance(expectedPosition, positions[actor]));
    }
  }

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

function fill (array: Array<any>, value: any) {
  for (let i = 0; i < array.length; i++) {
    array[i] = value;
  }

  return array;
}

function makeChildren (random: Random, n: number, depth: number): Entity[] {
  return fill(new Array(n), 0).map(() =>
    generateEntity(random.integer(MIN_SEED, MAX_SEED), depth + 1)
  )
}

function generateEntity (seed: number, depth = 0): Entity {
  const random = new Random(Random.engines.mt19937().seed(seed));

  const isLeaf = depth > 2 || random.bool();

  if (isLeaf) {
    const possibleCommands = ['moveLeft', 'moveRight', 'moveUp', 'moveDown'];

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
      return {
        type: command,
        id: seed.toString(),
        children: makeChildren(random, 2, depth),
        key: 'Right'
      }
    }

    return {
      type: command,
      id: seed.toString(),
      children: makeChildren(random, random.integer(2, MAX_SEQUENCE_CHILD_COUNT), depth)
    }
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

function helixPi (input: Input, seed: number): Output {
  const generationSize = 500;
  const random = new Random(Random.engines.mt19937().seed(seed));
  // Given an array of actor names
  // And a collection of scenarios

  let foo: Entity | undefined = undefined;
  // For each scenario
  input.scenarios.forEach(scenario => {
    //  For each actor
    Object.keys(scenario.actors).forEach(actor => {
      //   Generate N possible entities
      const entities = generateEntities(random, generationSize);
      //   Simulate them in this scenario

      //   Assign them each an error level based on how far they are from the desired position at each frame
      const errorLevels: EntityErrorLevels = {};

      entities.forEach(entity => {
        errorLevels[entity.id] = simulateAndFindErrorLevel(input, entity, scenario, actor);
      });

      const bestEntities = entities.sort((a, b) => errorLevels[a.id] - errorLevels[b.id]);

      foo = bestEntities[0];

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
    };
  }

  return {
    entities: {
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
    const inputEvents = input.input[currentFrame] || [];

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
      input: [],
      keys: [],

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

    const seed = 42;
    const output = helixPi(input, seed);

    const simulationResult = simulate(input, input.scenarios[0], output, {frames: 1});

    assert.deepEqual(simulationResult['keith'], {x: 1, y: 0});
  });

  it('can go left', () => {
    const input = {
      actors: ['keith'],
      input: [],
      keys: [],

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
      input: [],
      keys: [],

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
      input: [],
      keys: [],
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
      input: {
        1: [{type: 'keydown', key: 'Right'}]
      },

      keys: [
        'Right'
      ],

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

      input: {
        1: [{type: 'keydown', key: 'Right'}]
      },

      keys: [
        'Right'
      ],

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
});
