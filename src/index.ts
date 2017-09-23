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
  results?: Output;
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

function generateEntities(random: Random, generationSize: number, keys: string[]): Entity[] {
  const entities = [];

  while (entities.length < generationSize) {
    entities.push(generateEntity(random.integer(MIN_SEED, MAX_SEED), keys));
  }

  return entities;
}

//type BestFitness = { [key: string]: number };
//type BestEntities = { [key: string]: { [key2: string]: Entity[] } };
type BestEntities = { [actorId: string]: EntityWithFitness[] };
type EntityWithFitness = { entity: Entity, fitness: number };

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

type FitnessFunction = (input: Input, entity: Entity, actor: string) => EntityWithFitness;

function makeFitnessChecker(scenarios: Scenario[]): FitnessFunction {
  return function checkFitness(input: Input, entity: Entity, actor: string): EntityWithFitness {

    const fitnesses = scenarios.map(scenario => simulateAndFindErrorLevel(input, entity, scenario, actor));

    return { entity, fitness: sum(fitnesses) }
  }
}

function nodeIds(entity: Entity): string[] {
  if (isLeaf(entity)) {
    return [entity.id];
  }

  return flatten(entity.children.map(nodeIds));
}

function mapTree(entity: Entity, f: (e: Entity) => Entity): Entity {
  if (isLeaf(entity)) {
    return {...f({...entity})};
  }

  return {...f({...entity, children: entity.children.map(child => mapTree(child, f))})};
}

function findNode(entity: Entity, id: string): Entity | null {
  if (entity.id === id) {
    return entity;
  }

  if (isLeaf(entity)) {
    return null;
  }

  return entity.children.map(child => findNode(child, id)).filter(Boolean)[0];
}

function swap(random: Random, mum: Entity, dad: Entity): Entity[] {
  const nodeToSwapFromMum = findNode(mum, random.pick(nodeIds(mum))) as Entity;
  const nodeToSwapFromDad = findNode(dad, random.pick(nodeIds(dad))) as Entity;

  return [
    mapTree(mum, entity => entity.id === nodeToSwapFromMum.id ? nodeToSwapFromDad : entity),
    mapTree(dad, entity => entity.id === nodeToSwapFromDad.id ? nodeToSwapFromMum : entity)
  ];
}

function cat(random: Random, mum: Entity, dad: Entity): Entity[] {
  random;

  return [
    {
      type: 'sequence',
      id: `${mum}+${dad}`,
      children: [mum, dad]
    },
    {
      type: 'sequence',
      id: `${dad}+${mum}`,
      children: [dad, mum]
    },
  ]
}

function breedIndividuals(random: Random, mum: Entity, dad: Entity): Entity[] {
  const strategy = random.pick([cat, swap]);

  return strategy(random, mum, dad);
}

function breed(population: EntityWithFitness[], numberToBreed: number, random: Random): Entity[] {
  const output = [];

  while (output.length < numberToBreed) {
    const mum = random.pick(population).entity;

    let dad = mum;

    while (dad === mum) {
      dad = random.pick(population).entity;
    }

    output.push(...breedIndividuals(random, mum, dad));
  }

  return output;
}

function generateEntitiesForScenario(input: Input, checkFitness: FitnessFunction, actor: string, initialPopulation: Entity[], seed: number): EntityWithFitness[] {
  const populationSize = 30;
  const maxGenerations = 100;

  let generation = 0;

  const bestSolutions: BestEntities = {[actor]: []};

  const random = new Random(Random.engines.mt19937().seed(seed));

  const population = initialPopulation.slice();

  while (generation < maxGenerations) {
    if (population.length < populationSize) {
      population.push(...generateEntities(random, populationSize, input.keys));
    }

    const populationWithFitnesses = population.map(entity => checkFitness(input, entity, actor));

    const populationSortedByFitness = populationWithFitnesses.sort((a, b) => a.fitness - b.fitness);

    if (populationSortedByFitness[0].fitness < 1000) {
      console.log(generation, (populationSortedByFitness[0] || {fitness: Infinity}).fitness);
      return populationSortedByFitness.slice(0, 10);
    }

    bestSolutions[actor] = bestSolutions[actor]
      .concat(populationSortedByFitness)
      .sort((a, b) => a.fitness - b.fitness)
      .slice(0, 100);

    console.log(generation, (bestSolutions[actor][0] || {fitness: Infinity}).fitness);

    const children = breed(populationSortedByFitness, populationSize / 2, random);

    while (population.length > 0) {
      population.pop();
    }

    population.push(...children);

    generation += 1;
  }

  return bestSolutions[actor].slice(0, 10);
}

export function helixPi(input: Input, seed: number): Output {
  // Given a collection of scenarios, and a collection of actors
  // We want to generate code so that each actor performs the desired behaviour in each scenario
  //
  // Consider a situation where we have one scenario and one actor
  //
  // Assuming we have no existing solutions, we want to generate a population's worth of new ones
  //
  // We then want to find the fitness of each individual in the population. We
  // can do this by simulating the solution for the given actor in the scenario,
  // and then getting a number back representing the distance from the expected
  // points
  //
  // If we have found an optimal solution (ie fitness of 0), return it!
  // If not, we want to iterate
  //
  //
  //
  // if we have two scenarios, and one actor
  // we want to run the generation for each scenario
  // and then run it using the results of both of those, with a fitness function that checks each scenario

  if (input.scenarios.length === 0) {
    const actor = input.actors[0];
    const scenario = input.scenarios[0 ];

    const fitness = makeFitnessChecker([scenario]);
    const bestSolutions = generateEntitiesForScenario(input, fitness, actor, [], seed);

    return {entities: {[actor]: bestSolutions[0].entity}};
  } else {
    const random = new Random(Random.engines.mt19937().seed(seed));

    const actor = input.actors[0];

    const entitiesForEachScenario =
      input.scenarios.map(
        scenario => generateEntitiesForScenario(
          input,
          makeFitnessChecker([scenario]),
          actor,
          [],
          random.integer((-2) ** 53, 2 ** 53)
        )
      )

    const solutions = generateEntitiesForScenario(
      input,
      makeFitnessChecker(input.scenarios),
      actor,
      flatten(entitiesForEachScenario).map(entityWithFitness => entityWithFitness.entity),
      random.integer((-2) ** 53, 2 ** 53)
    );

    return {entities: {[actor]: solutions[0].entity}};
  }
}


function flatten<T> (t: T[][]): T[] {
  return t.concat.apply([], t);
}
