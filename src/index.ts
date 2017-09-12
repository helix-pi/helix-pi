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
import * as Random from "random-js";

import { Vector, distance, subtract } from "./vector";

const MAX_SEQUENCE_CHILD_COUNT = 3;
const MAX_SEED = Math.pow(2, 32);
const MIN_SEED = 0;

export type Input = {
  keys: string[];
  scenarios: Scenario[];
  actors: string[];
};

export type Output = {
  entities: { [key: string]: Entity };
};

export type UserInput = {
  [key: number]: InputEvent[];
};

export type InputEvent = {
  type: string;
  key: string;
};

export type InputState = {
  [key: string]: boolean;
};

export type LeafCommandName =
  | "moveRight"
  | "moveLeft"
  | "moveUp"
  | "moveDown"
  | "noop";

export type Entity = Tree;

export type Tree = Branch | Leaf;

export type Branch = Sequence | InputConditional;

export type Sequence = {
  type: "sequence";
  id: string;
  children: Array<Tree>;
};

export type InputConditional = {
  type: "inputConditional";
  key: string;
  id: string;
  children: Array<Tree>;
};

export type Leaf = {
  type: LeafCommandName;
  id: string;
};

export type Scenario = {
  name: string;
  id: string;
  input: UserInput;
  actors: { [key: string]: ActorFrame[] };
};

export type ActorFrame = {
  frame: number;
  position: Vector;
};

export type SimulationOptions = {
  frames: number;
  postFrameCallback?: (frame: number, positions: ActorPositions) => void;
};

export type ActorPositions = {
  [key: string]: Vector;
};

export type EntityErrorLevels = {
  [key: string]: number;
};

function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

function simulateAndFindErrorLevel(
  input: Input,
  entity: Entity,
  scenario: Scenario,
  actor: string
) {
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

      errorLevels.push(distance(subtract(expectedPosition, positions[actor])));
    }
  };

  const size = findSize(entity);

  simulate(input, scenario, output, options);

  return sum(errorLevels) * 1000 + size;
}

function isLeaf(tree: Tree): tree is Leaf {
  return !("children" in tree);
}

function findSize(tree: Tree): number {
  if (isLeaf(tree)) {
    return 1;
  }

  return sum(tree.children.map(findSize));
}

function makeArray<T>(n: number, f: () => T): Array<T> {
  const array: Array<T> = [];

  while (n > 0) {
    array.push(f());

    n--;
  }

  return array;
}

function makeChildren(random: Random, n: number, keys: string[], depth: number): Entity[] {
  return makeArray(n, () =>
    generateEntity(random.integer(MIN_SEED, MAX_SEED), keys, depth + 1)
  );
}

function generateEntity(seed: number, keys: string[], depth = 0): Entity {
  const random = new Random(Random.engines.mt19937().seed(seed));

  const isLeaf = depth > 2 || random.bool();

  if (isLeaf) {
    const possibleCommands = [
      "moveLeft",
      "moveRight",
      "moveUp",
      "moveDown",
      "noop"
    ];

    const command = (random as any).pick(possibleCommands) as LeafCommandName;

    return {
      type: command,
      id: seed.toString()
    };
  } else {
    const possibleCommands = ["sequence", "inputConditional"];
    // TODO - fix definitely typed definition
    const command = (random as any).pick(possibleCommands) as any;

    if (command === "inputConditional") {
      const key = (random as any).pick(keys);

      return {
        type: command,
        key,
        id: seed.toString(),
        children: makeChildren(random, 2, keys, depth)
      };
    }

    return {
      type: command,
      id: seed.toString(),
      children: makeChildren(
        random,
        random.integer(2, MAX_SEQUENCE_CHILD_COUNT),
        keys,
        depth
      )
    };
  }
}

// TODO - determinism
function generateEntities(random: Random, generationSize: number, keys: string[]): Entity[] {
  const entities = [];

  while (entities.length < generationSize) {
    entities.push(generateEntity(random.integer(MIN_SEED, MAX_SEED), keys));
  }

  return entities;
}

type BestFitness = { [key: string]: number };
type BestEntities = { [key: string]: { [key2: string]: Entity[] } };

export function helixPi(input: Input, seed: number): Output {
  if (input.actors.length === 0) {
    return {entities: {}};
  }

  const generationSize = 500;
  const generationCount = 5;
  const random = new Random(Random.engines.mt19937().seed(seed));
  // Given an array of actor names
  // And a collection of scenarios
  let allBestEntities: BestEntities = {};

  for (let actor of input.actors) {
    allBestEntities[actor] = {};
  }

  let generation = 0;
  let bestFitness: BestFitness = {};

  function highestFitness(bestFitness: BestFitness): number {
    if (Object.keys(bestFitness).length === 0) {
      return Infinity;
    }

    return Math.max(...Object.keys(bestFitness).map(key => bestFitness[key]));
  }

  while (generation < generationCount && highestFitness(bestFitness) > 100) {
    console.log(generation);
    // For each scenario
    input.scenarios.forEach((scenario, index) => {
      //  For each actor
      for (let actor of Object.keys(scenario.actors)) {
        //   Generate N possible entities
        const entities = generateEntities(random, generationSize, input.keys);
        //   Simulate them in this scenario

        //   Assign them each an error level based on how far they are from the desired position at each frame
        const errorLevels: EntityErrorLevels = {};

        for (let entity of entities) {
          errorLevels[entity.id] = simulateAndFindErrorLevel(
            input,
            entity,
            scenario,
            actor
          );
        }

        const bestEntities = entities.sort(
          (a, b) => errorLevels[a.id] - errorLevels[b.id]
        );
        const bestFitnessInGeneration = errorLevels[bestEntities[0].id];

        bestFitness[index] = Math.min(
          bestFitness[index] || Infinity,
          bestFitnessInGeneration
        );

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
      }
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

  const onlyActor = input.actors[0];
  const bestEntities = Object.keys(allBestEntities[onlyActor]).map(
    key => allBestEntities[onlyActor][key][0]
  );

  const entity = {
    type: "sequence",
    id: "nah",
    children: bestEntities
  } as Branch;

  return {
    entities: {
      [onlyActor]: entity
    }
  };
}

function executeCode(
  position: Vector,
  code: Entity,
  input: InputState
): Vector {
  if (code.type === "moveRight") {
    return { ...position, x: position.x + 1 };
  }

  if (code.type === "moveLeft") {
    return { ...position, x: position.x - 1 };
  }

  if (code.type === "moveUp") {
    return { ...position, y: position.y - 1 };
  }

  if (code.type === "moveDown") {
    return { ...position, y: position.y + 1 };
  }

  if (code.type === "sequence") {
    return code.children.reduce(
      (position, entity) => executeCode(position, entity, input),
      position
    );
  }

  if (code.type === "noop") {
    return position;
  }

  if (code.type === "inputConditional") {
    if (input[code.key]) {
      return executeCode(position, code.children[0], input);
    } else {
      return executeCode(position, code.children[1], input);
    }
  }

  throw new Error("Unimplemented code: " + JSON.stringify(code, null, 2));
}

export function simulate(
  input: Input,
  scenario: Scenario,
  output: Output,
  options: SimulationOptions
): ActorPositions {
  const actors = Object.keys(scenario.actors);

  const positions: ActorPositions = {};
  const inputState: InputState = {};

  input.keys.forEach(key => (inputState[key] = false));

  actors.forEach(actor => {
    positions[actor] = { ...scenario.actors[actor][0].position };
  });

  let frames = options.frames;
  let currentFrame = 0;

  while (currentFrame < frames) {
    const inputEvents = scenario.input[currentFrame] || [];

    inputEvents.forEach(event => {
      if (event.type === "keydown") {
        inputState[event.key] = true;
      } else {
        inputState[event.key] = false;
      }
    });

    if (options.postFrameCallback) {
      options.postFrameCallback(currentFrame, positions);
    }

    actors.forEach(actor => {
      positions[actor] = executeCode(
        positions[actor],
        output.entities[actor],
        inputState
      );
    });

    currentFrame++;
  }

  return positions;
}
