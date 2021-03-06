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

import { Vector, distance, subtract, add, multiply } from "./vector";

const boxCollide = require("box-collide");

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_SEQUENCE_CHILD_COUNT = 3;
const MAX_SEED = Math.pow(2, 32);
const MIN_SEED = 0;

export type Input = {
  keys: string[];
  scenarios: Scenario[];
  actors: { [actorId: string]: Actor };
  results?: Output;
};

export interface Actor {
  id: string;
  name: string;

  width: number;
  height: number;
  color: string;
}

export type Output = {
  entities: { [key: string]: Entity };
  errorLevels: ErrorLevels;
  positions: { [actorId: string]: ScenarioPositions };
};

export type ErrorLevels = { [actorId: string]: ScenarioErrorLevels };
export type ScenarioErrorLevels = { [scenarioId: string]: number };

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

export type Entity = Tree;

export type Tree = Branch | Leaf;

export type Branch =
  | Sequence
  | InputConditional
  | CollisionConditional
  | OnCreate;

export type Leaf = Move | SetVelocity | MultiplyVelocity | Noop;

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

export type CollisionConditional = {
  type: "collisionConditional";
  id: string;
  children: Array<Tree>;
};

export type Move = {
  type: "move";
  id: string;
  amount: number;
  direction: Direction;
};

export type SetVelocity = {
  type: "setVelocity";
  id: string;
  velocity: Vector;
};

export type MultiplyVelocity = {
  type: "multiplyVelocity";
  id: string;
  scalar: number;
};

export type OnCreate = {
  type: "onCreate";
  id: string;
  children: Array<Tree>;
};

export type Direction = "up" | "right" | "down" | "left";

export type Noop = {
  type: "noop";
  id: string;
};

export type Mutation = BranchMutation | LeafMutation | ConvertToNoopMutation;

export type BranchMutation =
  | SequenceMutation
  | InputConditionalMutation
  | OnCreateMutation;

export type LeafMutation =
  | MoveMutation
  | NoopMutation
  | SetVelocityMutation
  | MultiplyVelocityMutation;

export type SequenceMutation =
  | NewEntityMutation
  | RemovalMutation
  | SwitchMutation
  | ReplaceMutation;

export type InputConditionalMutation = SwitchMutation | ReplaceMutation;
export type OnCreateMutation = ReplaceMutation;
export type MultiplyVelocityMutation = {
  id: string;
  type: "MultiplyVelocityMutation";
  amount: number;
};

export type ConvertToNoopMutation = {
  id: string;
  type: "ConvertToNoopMutation";
};

export type NewEntityMutation = {
  id: string;
  type: "NewEntityMutation";
  newEntity: Entity;
  spliceIndex: number;
};

export type ReplaceMutation = {
  id: string;
  type: "ReplaceMutation";
  newEntity: Entity;
  spliceIndex: number;
};

export type RemovalMutation = {
  id: string;
  type: "RemovalMutation";
  removeIndex: number;
};

export type SwitchMutation = {
  id: string;
  type: "SwitchMutation";
  fromIndex: number;
  toIndex: number;
};

export type MoveMutation = {
  id: string;
  type: "MoveMutation";
  change: number;
};

export type NoopMutation = {
  id: string;
  type: "NoopMutation";
};

export type SetVelocityMutation = {
  id: string;
  type: "SetVelocityMutation";
  attribute: "x" | "y";
  change: number;
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
  postFrameCallback?: (frame: number, positions: ActorStates) => void;
};

export type ActorStates = {
  [key: string]: ActorState;
};

export type ActorState = {
  position: Vector;
  velocity: Vector;
  width: number;
  height: number;
  colliding: boolean;
};

export type Collision = {
  actorId: string;
};

export type EntityErrorLevels = {
  [key: string]: number;
};

function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

type ErrorLevelAndPositions = { errorLevel: number; positions: Vector[] };

function simulateAndFindErrorLevel(
  input: Input,
  entity: Entity,
  scenario: Scenario,
  actor: string
): ErrorLevelAndPositions {
  const errorLevels: number[] = [];
  const actorPositions: Vector[] = [];
  const output = {
    entities: {
      [actor]: entity
    },
    errorLevels: {},
    positions: {}
  };

  const frames = scenario.actors[actor].length;

  const options = {
    frames,

    postFrameCallback: (frame: number, positions: ActorStates) => {
      const expectedPosition = scenario.actors[actor][frame].position;
      const position = positions[actor].position;
      const errorLevel = distance(subtract(expectedPosition, position));

      actorPositions.push(position);
      errorLevels.push(errorLevel);
    }
  };

  const size = findSize(entity);

  simulate(actor, input, scenario, output, options);

  const totalError = sum(errorLevels) / frames * 1000 + size;

  return { errorLevel: totalError, positions: actorPositions };
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

function makeChildren(
  random: Random,
  n: number,
  keys: string[],
  depth: number
): Entity[] {
  return makeArray(n, () =>
    generateEntity(random.integer(MIN_SEED, MAX_SEED), keys, depth + 1)
  );
}

export function generateEntity(
  seed: number,
  keys: string[],
  depth = 0
): Entity {
  const random = new Random(Random.engines.mt19937().seed(seed));

  const isLeaf = depth > 1 || random.bool();

  if (isLeaf) {
    const possibleCommands = [
      "move",
      "setVelocity",
      "multiplyVelocity",
      "noop"
    ];

    const command = random.pick(possibleCommands);

    if (command === "noop") {
      return {
        type: command,
        id: seed.toString()
      };
    }

    if (command === "move") {
      const direction = random.pick([
        "up",
        "right",
        "left",
        "down"
      ]) as Direction;
      const amount = random.integer(0, 20) / 10;

      return {
        type: command,
        id: seed.toString(),
        direction,
        amount
      };
    }

    if (command === "setVelocity") {
      let velocity;

      if (random.bool(0.5)) {
        // cardinal direction
        const scalar = random.integer(0, 20) / 20;

        velocity = random.pick([
          { x: 0, y: -scalar },
          { x: scalar, y: 0 },
          { x: -scalar, y: 0 },
          { x: 0, y: scalar }
        ]);
      } else {
        velocity = {
          x: random.integer(-20, 20) / 20,
          y: random.integer(-20, 20) / 20
        };
      }

      return {
        type: command,
        id: seed.toString(),
        velocity
      };
    }

    if (command === "multiplyVelocity") {
      const scalar = random.integer(-20, 20) / 20;

      return {
        type: command,
        id: seed.toString(),
        scalar
      };
    }

    throw new Error("Unimplemented command");
  } else {
    const possibleCommands = [
      "sequence",
      "inputConditional",
      "collisionConditional"
    ];

    if (depth === 0) {
      possibleCommands.push("onCreate");
    }
    // TODO - fix definitely typed definition
    const command = (random as any).pick(possibleCommands) as any;

    if (command === "collisionConditional") {
      return {
        type: command,
        id: seed.toString(),
        children: makeChildren(random, 1, keys, depth)
      };
    }

    if (command === "inputConditional") {
      const key = (random as any).pick(keys);

      return {
        type: command,
        key,
        id: seed.toString(),
        children: makeChildren(random, 2, keys, depth)
      };
    }

    if (command === "onCreate") {
      return {
        type: command,
        id: seed.toString(),
        children: makeChildren(random, 1, keys, depth)
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

function generateEntities(
  random: Random,
  generationSize: number,
  keys: string[]
): Entity[] {
  const entities = [];

  while (entities.length < generationSize) {
    entities.push(generateEntity(random.integer(MIN_SEED, MAX_SEED), keys));
  }

  return entities;
}

//type BestFitness = { [key: string]: number };
//type BestEntities = { [key: string]: { [key2: string]: Entity[] } };
type BestEntities = { [actorId: string]: EntityWithFitness[] };
export type ScenarioPositions = { [scenarioId: string]: Vector[] };
type EntityWithFitness = {
  entity: Entity;
  fitness: number;
  errorLevels: ScenarioErrorLevels;
  positions: ScenarioPositions;
};

function colliding(
  actor: string,
  position: Box,
  positions: ActorStates
): boolean {
  const otherPositions = Object.keys(positions)
    .filter(key => key !== actor)
    .map(key => ({
      ...positions[key].position,
      width: positions[key].width,
      height: positions[key].height
    }));

  const colliding = otherPositions.some(otherPosition =>
    boxCollide(position, otherPosition)
  );

  return colliding;
}

export function executeCode(
  actor: string,
  actorState: ActorState,
  code: Entity,
  currentFrame: number,
  input: InputState,
  actorPositions: ActorStates,
  depth = 0
): ActorState {
  let { velocity, position } = actorState;
  let updatedActorState = actorState;

  if (depth === 0) {
    position = add(velocity, position);

    updatedActorState = { ...actorState, position };
  }

  if (code.type === "move") {
    if (code.direction === "left") {
      return {
        ...updatedActorState,
        position: { ...position, x: position.x - code.amount }
      };
    }

    if (code.direction === "up") {
      return {
        ...updatedActorState,
        position: { ...position, y: position.y - code.amount }
      };
    }

    if (code.direction === "down") {
      return {
        ...updatedActorState,
        position: { ...position, y: position.y + code.amount }
      };
    }

    if (code.direction === "right") {
      return {
        ...updatedActorState,
        position: { ...position, x: position.x + code.amount }
      };
    }
  }

  if (code.type === "setVelocity") {
    return { ...updatedActorState, velocity: code.velocity };
  }

  if (code.type === "multiplyVelocity") {
    return {
      ...updatedActorState,
      velocity: multiply(actorState.velocity, code.scalar)
    };
  }

  if (code.type === "sequence") {
    return code.children.reduce(
      (actorState, entity) =>
        executeCode(
          actor,
          actorState,
          entity,
          currentFrame,
          input,
          actorPositions,
          depth + 1
        ),
      updatedActorState
    );
  }

  if (code.type === "noop") {
    return actorState;
  }

  if (code.type === "inputConditional") {
    if (input[code.key]) {
      return executeCode(
        actor,
        updatedActorState,
        code.children[0],
        currentFrame,
        input,
        actorPositions,
        depth + 1
      );
    } else {
      return executeCode(
        actor,
        updatedActorState,
        code.children[1],
        currentFrame,
        input,
        actorPositions,
        depth + 1
      );
    }
  }

  if (code.type === "collisionConditional") {
    const box = {
      ...actorState.position,
      width: actorState.width,
      height: actorState.height
    };

    // TODO - this doesn't actually work, because this logic might run multiple
    //        times in a frame. we need to only run this once per frame.
    //    const previouslyColliding = actorState.colliding;
    const nowColliding = colliding(actor, box, actorPositions);

    updatedActorState.colliding = nowColliding;

    if (nowColliding) {
      return executeCode(
        actor,
        updatedActorState,
        code.children[0],
        currentFrame,
        input,
        actorPositions
      );
    } else {
      return updatedActorState;
    }
  }

  if (code.type === "onCreate") {
    if (currentFrame === 0) {
      return executeCode(
        actor,
        updatedActorState,
        code.children[0],
        currentFrame,
        input,
        actorPositions
      );
    } else {
      return updatedActorState;
    }
  }

  throw new Error("Unimplemented code: " + JSON.stringify(code, null, 2));
}

export function simulate(
  activeActor: string,
  input: Input,
  scenario: Scenario,
  output: Output,
  options: SimulationOptions
): ActorStates {
  const actors = Object.keys(scenario.actors);

  const states: ActorStates = {};
  const inputState: InputState = {};

  input.keys.forEach(key => (inputState[key] = false));

  actors.forEach(actor => {
    states[actor] = {
      position: { ...scenario.actors[actor][0].position },
      velocity: { x: 0, y: 0 },
      width: input.actors[actor].width,
      height: input.actors[actor].height,
      colliding: false
    };
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
      options.postFrameCallback(currentFrame, states);
    }

    activeActor;
    actors.forEach(actor => {
      if (activeActor === actor) {
        states[actor] = executeCode(
          actor,
          states[actor],
          output.entities[actor],
          currentFrame,
          inputState,
          states
        );
      } else {
        const actorObj = input.actors[actor];

        if (!actorObj) {
          throw new Error("Could not find actor");
        }

        states[actor] = {
          position: actorPosition(scenario.actors[actor], currentFrame)
            .position,
          velocity: { x: 0, y: 0 },
          width: actorObj.width,
          height: actorObj.height,
          colliding: false
        };
      }
    });

    currentFrame++;
  }

  return states;
}

type FitnessFunction = (
  input: Input,
  entity: Entity,
  actor: string
) => EntityWithFitness;

function makeFitnessChecker(scenarios: Scenario[]): FitnessFunction {
  return function checkFitness(
    input: Input,
    entity: Entity,
    actor: string
  ): EntityWithFitness {
    const errorLevels: { [scenarioId: string]: number } = {};
    const scenarioPositions: ScenarioPositions = {};

    const fitnesses = scenarios.map(scenario => {
      const { errorLevel, positions } = simulateAndFindErrorLevel(
        input,
        entity,
        scenario,
        actor
      );

      errorLevels[scenario.id] = errorLevel;
      scenarioPositions[scenario.id] = positions;

      return errorLevel;
    });

    const total = sum(fitnesses);

    errorLevels["_total"] = total / scenarios.length;

    return {
      entity,
      fitness: total,
      errorLevels,
      positions: scenarioPositions
    };
  };
}

function nodeIds(entity: Entity): string[] {
  if (isLeaf(entity)) {
    return [entity.id];
  }

  return flatten(entity.children.map(nodeIds));
}

function mapTree(entity: Entity, f: (e: Entity) => Entity): Entity {
  if (isLeaf(entity)) {
    return { ...f({ ...entity }) };
  }

  return {
    ...f({
      ...entity,
      children: entity.children.map(child => mapTree(child, f))
    })
  };
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

function selectNode<T>(
  entity: Entity,
  selector: (e: Entity) => T | null
): T | null {
  const result = selector(entity);
  if (result) {
    return result;
  }

  if (isLeaf(entity)) {
    return null;
  }

  for (const child of entity.children) {
    const result = selectNode(child, selector);

    if (result) return result;
  }

  return null;
}
function swap(random: Random, mum: Entity, dad: Entity): Entity[] {
  const nodeToSwapFromMum = findNode(mum, random.pick(nodeIds(mum))) as Entity;
  const nodeToSwapFromDad = findNode(dad, random.pick(nodeIds(dad))) as Entity;

  if (!nodeToSwapFromMum || !nodeToSwapFromDad) {
    return [mum, dad];
  }

  return [
    mapTree(
      mum,
      entity =>
        entity.id === nodeToSwapFromMum.id ? nodeToSwapFromDad : entity
    ),
    mapTree(
      dad,
      entity =>
        entity.id === nodeToSwapFromDad.id ? nodeToSwapFromMum : entity
    )
  ];
}

function cat(random: Random, mum: Entity, dad: Entity): Entity[] {
  random;

  return [
    {
      type: "sequence",
      id: `(${mum.id}+${dad.id})`,
      children: [mum, dad]
    },
    {
      type: "sequence",
      id: `(${dad.id}+${mum.id})`,
      children: [dad, mum]
    }
  ];
}

function breedIndividuals(random: Random, mum: Entity, dad: Entity): Entity[] {
  const strategy = random.pick([cat, swap, swap]);

  return strategy(random, mum, dad);
}

function breed(
  population: EntityWithFitness[],
  numberToBreed: number,
  random: Random
): Entity[] {
  const output = [];

  function pickParents(): Entity[] {
    return random
      .sample(population, 8)
      .sort((a, b) => a.fitness - b.fitness)
      .slice(0, 2)
      .map(result => result.entity);
  }

  while (output.length < numberToBreed) {
    const [mum, dad] = pickParents();

    output.push(...breedIndividuals(random, mum, dad));
  }

  return output;
}

function generateEntitiesForScenario(
  input: Input,
  checkFitness: FitnessFunction,
  actor: string,
  initialPopulation: Entity[],
  seed: number
): EntityWithFitness[] {
  const populationSize = 256;
  const maxGenerations = 10;

  let generation = 0;

  const bestSolutions: BestEntities = { [actor]: [] };

  const random = new Random(Random.engines.mt19937().seed(seed));

  let population: Entity[] = [];

  while (generation < maxGenerations) {
    if (population.length < populationSize) {
      population.push(
        ...generateEntities(
          random,
          populationSize - population.length,
          input.keys
        )
      );
    }

    population.push(...initialPopulation);

    const populationWithFitnesses = population.map(entity =>
      checkFitness(input, entity, actor)
    );

    const populationSortedByFitness = populationWithFitnesses.sort(
      (a, b) => a.fitness - b.fitness
    );

    if (populationSortedByFitness[0].fitness < 20) {
      console.log("early return!", populationSortedByFitness[0].fitness / 1000);
      return populationSortedByFitness.slice(0, 10);
    }

    bestSolutions[actor] = bestSolutions[actor]
      .concat(populationSortedByFitness)
      .sort((a, b) => a.fitness - b.fitness)
      .slice(0, 100);

    console.log(
      generation,
      (bestSolutions[actor][0] || { fitness: Infinity }).fitness / 1000
    );

    const children = breed(
      populationSortedByFitness
        .slice(0, 32)
        .concat(bestSolutions[actor].slice(0, 8)),
      populationSize / 2,
      random
    );

    while (population.length > 0) {
      population.pop();
    }

    population.push(...children);

    population = population.map(entity => mutate(input.keys, random, entity));

    generation += 1;
  }

  return bestSolutions[actor].slice(0, 10);
}

const MUTATE_PERCENTAGE = 0.02;

function mutateNode(keys: string[], random: Random, entity: Entity): Entity {
  const willMutate = random.bool(MUTATE_PERCENTAGE);

  if (!willMutate) {
    return entity;
  }

  const mutationId = random.integer(MIN_SEED, MAX_SEED);
  const mutation = chooseMutation(keys, mutationId, entity);

  return applyMutation(entity, mutation);
}

function applyMutation(entity: Entity, mutation: Mutation): Entity {
  if (mutation.type === "NewEntityMutation") {
    const newChildren = (entity as Branch).children.slice();

    newChildren.splice(mutation.spliceIndex, 0, mutation.newEntity);

    return {
      ...entity,

      id: `(${entity.id}%${mutation.id})`,

      children: newChildren
    };
  }

  if (mutation.type === "RemovalMutation") {
    const newChildren = (entity as Branch).children
      .slice()
      .filter((_, index) => index !== mutation.removeIndex);

    return {
      ...entity,

      id: `(${entity.id}%${mutation.id})`,
      children: newChildren
    };
  }

  if (mutation.type === "SwitchMutation") {
    const branch = entity as Branch;

    const newChildren = branch.children.map((child, index) => {
      if (index === mutation.fromIndex) {
        return branch.children[mutation.toIndex];
      }

      if (index === mutation.toIndex) {
        return branch.children[mutation.fromIndex];
      }

      return child;
    });

    return {
      ...entity,

      id: `(${entity.id}%${mutation.id})`,

      children: newChildren
    };
  }

  if (mutation.type === "MoveMutation") {
    const move = entity as Move;

    return {
      ...move,

      id: `(${entity.id}%${mutation.id})`,

      amount: move.amount + mutation.change
    };
  }

  if (mutation.type === "ReplaceMutation") {
    const newChildren = (entity as Branch).children.slice();

    newChildren.splice(mutation.spliceIndex, 1, mutation.newEntity);

    return {
      ...entity,

      id: `(${entity.id}%${mutation.id})`,

      children: newChildren
    };
  }

  if (mutation.type === "SetVelocityMutation") {
    const setVelocity = entity as SetVelocity;

    return {
      ...setVelocity,

      id: `(${entity.id}%${mutation.id})`,

      velocity: {
        ...setVelocity.velocity,

        [mutation.attribute]:
          setVelocity.velocity[mutation.attribute] + mutation.change
      }
    };
  }

  if (mutation.type === "MultiplyVelocityMutation") {
    const multiplyVelocity = entity as MultiplyVelocity;

    return {
      ...multiplyVelocity,

      id: `(${entity.id}%${mutation.id})`,

      scalar: multiplyVelocity.scalar + mutation.amount
    };
  }

  if (mutation.type === "NoopMutation") {
    return { ...entity };
  }

  if (mutation.type === "ConvertToNoopMutation") {
    return {
      type: "noop",
      id: entity.id
    };
  }

  throw new Error(`Unimplemented mutation ${(mutation as Mutation).type}`);
}

function chooseMutation(
  keys: string[],
  seed: number,
  entity: Entity
): Mutation {
  const random = new Random(Random.engines.mt19937().seed(seed));

  if (random.bool(0.5)) {
    return {
      id: seed.toString(),
      type: "ConvertToNoopMutation"
    };
  }

  if (entity.type === "sequence") {
    const types = [
      "NewEntityMutation",
      "RemovalMutation",
      "SwitchMutation",
      "ReplaceMutation"
    ];

    const mutationType = random.pick(types);

    if (mutationType === "NewEntityMutation") {
      const newEntity = generateEntity(
        random.integer(MIN_SEED, MAX_SEED),
        keys,
        0
      );

      return {
        id: seed.toString(),
        type: mutationType,
        newEntity,
        spliceIndex: random.integer(0, (entity as Branch).children.length)
      };
    }

    if (mutationType === "ReplaceMutation") {
      const newEntity = generateEntity(
        random.integer(MIN_SEED, MAX_SEED),
        keys,
        0
      );

      return {
        id: seed.toString(),
        type: mutationType,
        newEntity,
        spliceIndex: random.integer(0, (entity as Branch).children.length - 1)
      };
    }

    if (mutationType === "RemovalMutation") {
      return {
        id: seed.toString(),
        type: mutationType,
        removeIndex: random.integer(0, entity.children.length - 1)
      };
    }

    if (mutationType === "SwitchMutation") {
      return {
        id: seed.toString(),
        type: mutationType,
        fromIndex: random.integer(0, entity.children.length - 1),
        toIndex: random.integer(0, entity.children.length - 1)
      };
    }
  }

  if (entity.type === "onCreate") {
    const newEntity = generateEntity(
      random.integer(MIN_SEED, MAX_SEED),
      keys,
      0
    );

    return {
      id: seed.toString(),
      type: "ReplaceMutation",
      newEntity,
      spliceIndex: random.pick([0, 1])
    };
  }

  if (entity.type === "collisionConditional") {
    const newEntity = generateEntity(
      random.integer(MIN_SEED, MAX_SEED),
      keys,
      0
    );

    return {
      id: seed.toString(),
      type: "ReplaceMutation",
      newEntity,
      spliceIndex: random.pick([0, 1])
    };
  }

  if (entity.type === "inputConditional") {
    const types = ["SwitchMutation", "ReplaceMutation"];

    const mutationType = random.pick(types);

    if (mutationType === "SwitchMutation") {
      return {
        id: seed.toString(),
        type: "SwitchMutation",
        fromIndex: 0,
        toIndex: 1
      };
    }

    if (mutationType === "ReplaceMutation") {
      const newEntity = generateEntity(
        random.integer(MIN_SEED, MAX_SEED),
        keys,
        0
      );

      return {
        id: seed.toString(),
        type: mutationType,
        newEntity,
        spliceIndex: random.pick([0, 1])
      };
    }
  }

  if (entity.type === "move") {
    return {
      id: seed.toString(),
      type: "MoveMutation",
      change: random.integer(-10, 10) / 10
    };
  }

  if (entity.type === "setVelocity") {
    const attribute = random.pick(["x", "y"]) as any;

    return {
      type: "SetVelocityMutation",
      id: seed.toString(),
      attribute,
      change: random.integer(-1, 1) / 10
    };
  }

  if (entity.type === "multiplyVelocity") {
    return {
      type: "MultiplyVelocityMutation",
      id: seed.toString(),

      amount: random.integer(-10, 10) / 10
    };
  }

  if (entity.type === "noop") {
    return {
      id: seed.toString(),
      type: "NoopMutation"
    };
  }

  throw new Error(`Unimplemented type ${entity.type}`);
}

function mutate(keys: string[], random: Random, entity: Entity): Entity {
  return mapTree(entity, node => mutateNode(keys, random, node));
}

function removeCodeThatDoesNotHelpFitness(
  code: Entity,
  scenarios: Scenario[],
  actor: string,
  input: Input
): Entity {
  // for each node in the tree, try replacing it with a noop
  // if the fitness of the noop is better than the old node, replace it permanently and restart
  // continue until all nodes contribute to fitness
  //
  const fitnessChecker = makeFitnessChecker(scenarios);

  let baseFitness = fitnessChecker(input, code, actor).fitness;

  let result = code;

  function doTheThing(node: Entity) {
    const possiblyThis = mapTree(result, n => {
      if (node.id === n.id) {
        return { type: "noop", id: Math.random().toString() };
      } else {
        return n;
      }
    });

    const newFitness = fitnessChecker(input, possiblyThis, actor).fitness;

    if (newFitness < baseFitness) {
      baseFitness = newFitness;
      return possiblyThis;
    }

    return null;
  }

  let progress = true;

  while (progress) {
    const newTree = selectNode(result, doTheThing);

    if (newTree) {
      result = newTree;
    }

    console.log(baseFitness);
    progress = !!newTree;
  }

  return result;
}

export function tumbler(
  code: Entity,
  scenarios: Scenario[] = [],
  input?: Input,
  actor = ""
): Entity {
  if (scenarios.length > 0 && input) {
    code = removeCodeThatDoesNotHelpFitness(code, scenarios, actor, input);
  }

  return mapTree(code, node => {
    if (isLeaf(node)) {
      return node;
    } else {
      if (node.children.every(child => child.type === "noop")) {
        return {
          type: "noop",
          id: "tumbler-refactor"
        };
      }

      if (
        node.type === "sequence" &&
        node.children.find(node => node.type === "sequence")
      ) {
        node = {
          ...node,
          id: "tumbler-flatten",
          children: flatten(
            node.children.map(
              node => (node.type === "sequence" ? node.children : [node])
            )
          )
        };
      }

      if (node.type === "sequence") {
        node = {
          ...node,
          children: node.children.filter(node => node.type !== "noop")
        };
      }

      return node;
    }
  });
}

function setErrorLevel(
  errorLevels: ErrorLevels,
  actor: string,
  scenarioErrorLevels: ScenarioErrorLevels
) {
  if (!errorLevels.hasOwnProperty(actor)) {
    errorLevels[actor] = {};
  }

  Object.assign(errorLevels[actor], scenarioErrorLevels);

  return errorLevels;
}

export function helixPi(
  input: Input,
  seed: number,
  previousOutput: Output | null = null
): Output {
  const results: Output = { entities: {}, errorLevels: {}, positions: {} };

  Object.keys(input.actors).forEach(actor => {
    const scenariosForActor = input.scenarios.filter(
      scenario => actor in scenario.actors
    );

    if (scenariosForActor.length === 1) {
      console.log("Generating for", actor);
      const scenario = scenariosForActor[0];

      if (!(actor in scenario.actors)) {
        return;
      }

      const fitness = makeFitnessChecker([scenario]);
      let previousSolutions: Entity[] = [];

      if (previousOutput && previousOutput.entities[actor]) {
        previousSolutions = [previousOutput.entities[actor]];
      }

      const bestSolutions = generateEntitiesForScenario(
        input,
        fitness,
        actor,
        previousSolutions,
        seed
      );

      console.log("size before tumbler", findSize(bestSolutions[0].entity));
      results.entities[actor] = tumbler(
        bestSolutions[0].entity,
        [scenario],
        input,
        actor
      );
      console.log("size after tumbler", findSize(results.entities[actor]));

      setErrorLevel(results.errorLevels, actor, {
        [scenario.id]: bestSolutions[0].fitness
      });
      results.positions[actor] = bestSolutions[0].positions;
    } else {
      console.log("Generating for", actor);
      const random = new Random(Random.engines.mt19937().seed(seed));

      let previousSolutions: Entity[] = [];

      if (previousOutput && previousOutput.entities[actor]) {
        previousSolutions = [previousOutput.entities[actor]];
      }

      const entitiesForEachScenario = flatten(
        scenariosForActor.map(
          scenario =>
            console.log("scenario:", scenario.name) ||
            generateEntitiesForScenario(
              input,
              makeFitnessChecker([scenario]),
              actor,
              previousSolutions,
              random.integer((-2) ** 53, 2 ** 53)
            )
        )
      );

      console.log("final solution:", previousSolutions, previousOutput);
      const solutions = generateEntitiesForScenario(
        input,
        makeFitnessChecker(scenariosForActor),
        actor,
        previousSolutions.concat(
          entitiesForEachScenario.map(
            entityWithFitness => entityWithFitness.entity
          )
        ),
        random.integer((-2) ** 53, 2 ** 53)
      );

      console.log("size before tumbler", findSize(solutions[0].entity));
      results.entities[actor] = tumbler(
        solutions[0].entity,
        scenariosForActor,
        input,
        actor
      );
      console.log("size after tumbler", findSize(results.entities[actor]));
      setErrorLevel(results.errorLevels, actor, solutions[0].errorLevels);
      results.positions[actor] = solutions[0].positions;
    }
  });

  return results;
}

function last<T>(array: T[]): T {
  return array[array.length - 1];
}

export function actorPosition(frames: ActorFrame[], frame: number) {
  return frames[frame] || last(frames.slice(0, frame).filter(Boolean));
}

function flatten<T>(t: T[][]): T[] {
  return t.concat.apply([], t);
}
