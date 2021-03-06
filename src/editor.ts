import {
  makeDOMDriver,
  h1,
  h2,
  span,
  div,
  input,
  a,
  h,
  pre,
  button,
  DOMSource,
  VNode
} from "@cycle/dom";
import { makeHistoryDriver } from "@cycle/history";
import isolate from "@cycle/isolate";
import makeIDBDriver, { $add, $update } from "cycle-idb";
import onionify, { StateSource } from "cycle-onionify";
import { timeDriver, TimeSource } from "@cycle/time";
import { routerify, RouterSource, RouterSink } from "cyclic-router";
import { run } from "@cycle/run";
import { makeWebWorkerDriver } from "cycle-webworker";
import switchPath from "switch-path";
import * as uuid from "uuid";
import * as work from "webworkify";
import xs, { Stream } from "xstream";
import sampleCombine from "xstream/extra/sampleCombine";

import {
  actorPosition,
  executeCode,
  Actor,
  ActorStates,
  Scenario,
  Input,
  Output,
  ErrorLevels
} from "./index";
//import { codeToString } from "./code-to-string";
import { inputEventsToRanges, InputRange } from "./input-events-to-ranges";
import { tweenFrames } from "./tween-frames";
import { Vector, add, subtract } from "./vector";

interface Project {
  id: string;
  name: string;
  selectedScenarioId: null | string;
  selectedActorId: null | string;
  selectedScenarioObject: null | string;
  lastInput: string | null;
  keys: string[];

  currentFrame: number;

  dragOffset: Vector | null;

  scenarios: Scenario[];
  actors: Actor[];
  results: Output;
}

interface ISources {
  DOM: DOMSource;
  Time: TimeSource;
  Router: RouterSource;
  DB: any;
  id?: string;
  HelixPi: Stream<Output>;
}

type InputAndResults = {
  input: Input;
  results: Output;
};

interface ISinks {
  DOM: Stream<VNode>;
  Router?: RouterSink;
  DB?: any;
  HelixPi?: Stream<InputAndResults>;
}

function transformValues<A, B>(
  obj: { [k: string]: A },
  f: (a: A) => B
): { [k: string]: B } {
  const out: { [k: string]: B } = {};

  for (let key of Object.keys(obj)) {
    out[key] = f(obj[key]);
  }

  return out;
}

function tweenFramesInScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,

    actors: transformValues(scenario.actors, tweenFrames)
  };
}

function projectToHelixPiInput(project: Project): Input {
  project;

  return {
    keys: project.keys,
    scenarios: project.scenarios.map(tweenFramesInScenario),
    actors: index(project.actors, actor => actor.id)
  };
}

function index<T>(array: T[], indexSelector: (t: T) => string): {[key: string]: T} {
  const result: {[key: string]: T} = {};

  array.forEach(item => result[indexSelector(item)] = item);

  return result;
}

function homeView(projects: Project[]): VNode {
  return div(".welcome", [
    h1("Helix Pi"),

    div(".options", [
      a(".new-project", "Create new project"),

      div(".recent-projects", [
        h2("Recent projects"),

        div(
          ".projects.flex-column",
          projects.map(project =>
            a(
              ".goto-project",
              { attrs: { href: `/project/${project.id}` } },
              project.name
            )
          )
        )
      ])
    ])
  ]);
}

function Home(sources: ISources): ISinks {
  const projects$ = sources.DB.store("projects").getAll();

  return {
    DOM: projects$.map(homeView)
  };
}

interface IProjectNameSources extends ISources {
  name$: Stream<string>;
}

interface IProjectNameSinks extends ISinks {
  name$: Stream<string>;
  nameChange$: Stream<string>;
}

function ProjectName(sources: IProjectNameSources): IProjectNameSinks {
  const startEditing$ = sources.DOM
    .select(".edit-project-name")
    .events("click")
    .mapTo(true);

  const save$ = sources.DOM
    .select(".save-project-name")
    .events("click")
    .mapTo(false);

  const cancelEditing$ = sources.DOM
    .select(".cancel-editing-project-name")
    .events("click")
    .mapTo(false);

  const editing$ = xs.merge(xs.of(false), startEditing$, save$, cancelEditing$);

  const newName$ = sources.DOM
    .select(".project-name-input")
    .events("input")
    .map((ev: any) => ev.currentTarget.value);

  const nameChange$ = newName$.map(name => save$.mapTo(name)).flatten();

  function view([name, editing]: [string, boolean]): VNode {
    if (editing) {
      return div(".project-name-container", [
        div([
          input(".project-name-input", { props: { value: name } }),
          a(".save-project-name", " ✓ "),
          a(".cancel-editing-project-name", " ✖ ")
        ])
      ]);
    }

    return div(".project-name-container", [
      div([span(".project-name", `${name}`), a(".edit-project-name", " ✎ ")])
    ]);
  }

  return {
    DOM: xs.combine(sources.name$, editing$).map(view),

    name$: xs.merge(sources.name$, nameChange$),

    nameChange$
  };
}

function makeActor(): Actor {
  return {
    id: uuid.v4().split("-")[0],
    name: "Untitled actor",
    width: 100,
    height: 100,
    color: "white"
  };
}

function makeScenario(): Scenario {
  return {
    name: "Untitled scenario",
    input: {},
    actors: {},
    id: uuid.v4().split("-")[0]
  };
}

function makeProject(id: string): Project {
  const scenario = makeScenario();

  return {
    id,
    name: "Untitled",
    scenarios: [scenario],
    actors: [],
    selectedScenarioId: scenario.id,
    selectedActorId: null,
    selectedScenarioObject: null,
    dragOffset: null,
    currentFrame: 0,
    lastInput: null,
    results: { entities: {}, errorLevels: {}, positions: {} },
    keys: ["w", "a", "s", "d"] // TODO - don't hardcode this
  };
}

function renderScenarioButton(scenario: Scenario): VNode {
  return div(".scenario-button", [
    a(".delete-scenario", { attrs: { "data-id": scenario.id } }, '✖︎'),
    a(".select-scenario", { attrs: { "data-id": scenario.id } }, scenario.name)
  ]);
}

function renderActorButton(actor: Actor): VNode {
  return div(".actor-button", [
    a(".select-actor", { attrs: { "data-id": actor.id } }, actor.name)
  ]);
}

function renderRecordControls(recording: boolean): VNode {
  if (recording) {
    return h("circle", {
      class: { "stop-recording": true },
      attrs: { cx: 25, cy: 25, r: 15, fill: "darkred" }
    });
  }

  return h("circle", {
    class: { record: true },
    attrs: { cx: 25, cy: 25, r: 15, fill: "red" }
  });
}

function renderPlayPauseControls(playing: boolean): VNode {
  if (!playing) {
    return h("polygon", {
      class: { play: true },
      attrs: { points: "10,55 40,70 10,85", fill: "lime" }
    });
  }

  return h("g", { class: { pause: true } }, [
    h("rect", {
      attrs: {
        x: 15,
        y: 55,
        height: 30,
        width: 5,
        fill: "lime"
      }
    }),
    h("rect", {
      attrs: {
        x: 30,
        y: 55,
        height: 30,
        width: 5,
        fill: "lime"
      }
    })
  ]);
}

function renderInputRange(
  inputRanges: { key: string; input: InputRange[] },
  i: number
): VNode {
  const height = 10;
  const previewWidth = 101.82;
  return h("g", [
    h(
      "text",
      {
        attrs: {
          x: 30,
          y: i * height + 12,
          stroke: "white",
          fill: "white",
          "font-size": "10pt"
        }
      },
      inputRanges.key
    ),

    ...inputRanges.input.map(inputRange =>
      h("rect", {
        attrs: {
          x: 50 + inputRange.from / 60 * previewWidth,
          y: i * height + 9,
          width:
            50 +
            inputRange.to / 60 * previewWidth -
            (50 + inputRange.from / 60 * previewWidth),
          height,
          fill: "yellow",
          stroke: "gold"
        }
      })
    )
  ]);
}

function renderInput(project: Project, scenario: Scenario): VNode {
  project;
  scenario;
  const controlWidth = 50;

  const inputRanges = inputEventsToRanges(scenario.input, project.keys);

  const keys = Object.keys(inputRanges).sort();

  const ranges = keys.map(key => ({ key, input: inputRanges[key] }));

  return h(
    "svg",
    { attrs: { width: 800, height: 50 }, class: { "input-controls": true } },
    [
      h("rect", {
        attrs: {
          x: controlWidth,
          y: 0,
          width: 750,
          height: 50,
          fill: "#181818"
        }
      }),

      ...ranges.map(renderInputRange)
    ]
  );
}

function renderTimeBar(
  project: Project,
  scenario: Scenario,
  playing: boolean,
  recording: boolean
): VNode {
  const previewFrames = new Array(10).fill(0);

  const lines = new Array(100).fill(0);

  const previewWidth = 101.82;

  const controlWidth = 50;

  const frame = project.currentFrame;

  const frameMarkerX = controlWidth + frame / 60 * previewWidth;

  return h(
    "svg",
    { class: { timebar: true }, attrs: { width: 800, height: 90 } },
    [
      h("circle", {
        attrs: { cx: 25, cy: 25, r: 15, fill: "darkred" }
      }),

      renderRecordControls(recording),

      renderPlayPauseControls(playing),

      h("rect", {
        attrs: {
          x: controlWidth,
          y: 5,
          width: 750,
          height: 85,
          fill: "#181818"
        }
      }),

      ...lines.map((_, index) =>
        h("line", {
          attrs: {
            x1: controlWidth + index * previewWidth / 10,
            y1: 75,
            x2: controlWidth + index * previewWidth / 10,
            y2: 75 + (index % 10 === 0 ? 5 : 3),
            stroke: "#555"
          }
        })
      ),

      ...previewFrames.map((_, index) =>
        h("g", [
          renderSimulation(
            project,
            scenario,
            false,
            false,
            index * 60,
            false,
            true,
            index
          ),
          index > 0
            ? h(
                "text",
                {
                  attrs: {
                    x: controlWidth + index * previewWidth - 3,
                    y: 89,
                    fill: "#888",
                    stroke: "#888",
                    "font-size": "8pt"
                  }
                },
                `${index}s`
              )
            : "",

          h("rect", {
            attrs: {
              x: controlWidth + index * previewWidth,
              y: 5,
              width: previewWidth,
              height: 70,
              stroke: "#555",
              fill: "none"
            }
          })
        ])
      ),

      h("line", {
        attrs: {
          x1: frameMarkerX,
          y1: 5,
          x2: frameMarkerX,
          y2: 90,
          stroke: "white"
        }
      })
    ]
  );
}

function renderSimulation(
  project: Project,
  scenario: Scenario,
  playing: boolean,
  recording: boolean,
  frame: number,
  grid = true,
  mini = false,
  offsetIndex = 0
) {
  const lines = new Array(Math.ceil(800 / 50)).fill(0);
  let lineVNodes: VNode[] = [];

  if (grid) {
    lineVNodes = [
      ...lines.map((_, index) =>
        h("line", {
          attrs: {
            x1: 0,
            y1: index * 50,
            x2: 800,
            y2: index * 50,
            stroke: "#333"
          }
        })
      ),
      ...lines.map((_, index) =>
        h("line", {
          attrs: {
            x1: index * 50,
            y1: 0,
            x2: index * 50,
            y2: 550,
            stroke: "#333"
          }
        })
      )
    ];
  }

  let width = 800;
  let height = 550;
  let x = 0;
  let y = 0;

  if (mini) {
    height = 70;
    width = width * (height / 550);
    y = 5;
    x = 50 + offsetIndex * width;
  }

  const viewBox = `0 0 800 550`;

  return h(
    "svg",
    {
      class: { simulation: true, mini, main: !mini },
      attrs: { width, height, viewBox, x, y }
    },
    [
      ...lineVNodes,

      ...Object.keys(scenario.actors).map(id => {
        const actor = project.actors.find(actor => actor.id === id) as Actor;
        const frames = scenario.actors[id];
        const actorFrame = actorPosition(frames, frame);
        const selected =
          (!playing || recording) &&
          actor.id === project.selectedScenarioObject;

        return renderActor(
          actor,
          mini ? [] : actorPositions(project, actor.id, scenario.id),
          frame,
          actorFrame.position.x,
          actorFrame.position.y,
          selected
        );
      })
    ]
  );
}

function actorPositions(project: Project, actorId: string, scenarioId: string): Vector[] {
  const positions = project.results.positions;

  return (positions[actorId] && positions[actorId][scenarioId]) || [];
}

function renderScenario(
  project: Project,
  scenario: Scenario,
  playing: boolean,
  recording: boolean,
  scenarioNameVtree: VNode
): VNode {
  return div(".scenario.flex-column", [
    div(".simulation-container", [
      div(".scenario-name", [scenarioNameVtree]),
      renderSimulation(
        project,
        scenario,
        playing,
        recording,
        project.currentFrame
      )
    ]),

    renderInput(project, scenario),

    renderTimeBar(project, scenario, playing, recording)
  ]);
}

function renderActor(
  actor: Actor,
  frames: Vector[],
  frame: number,
  x: number,
  y: number,
  selected = false
): VNode {
  const outlineExtraSize = 10;

  frames = frames || [];

  const children: VNode[] = [];

  frames.forEach((position, index) => {
    const isCurrent = index === frame;
    children.push(
      h("rect", {
        class: {
          "actor-preview": true
        },
        attrs: {
          x: position.x - actor.width / 2,
          y: position.y - actor.height / 2,
          height: actor.height,
          width: actor.width,
          fill: isCurrent ? 'skyblue' : actor.color,
          opacity: isCurrent ? 0.5 : 0.01
        }
      })
    );
  });

  children.push(
    h("rect", {
      class: {
        actor: true
      },
      attrs: {
        id: actor.id,
        x: x - actor.width / 2,
        y: y - actor.height / 2,
        height: actor.height,
        width: actor.width,
        fill: actor.color
      }
    })
  );

  if (selected) {
    children.push(
      h("rect", {
        attrs: {
          x: x - actor.width / 2 - outlineExtraSize / 2,
          y: y - actor.height / 2 - outlineExtraSize / 2,
          height: actor.height + outlineExtraSize,
          width: actor.width + outlineExtraSize,
          stroke: "skyblue",
          fill: "none"
        }
      })
    );
  }

  return h("g", children);
}

function activeScenario(project: Project): Scenario | undefined {
  return project.scenarios.find(
    scenario => scenario.id === project.selectedScenarioId
  );
}

function selectedActor(project: Project): Actor | undefined {
  return project.actors.find(actor => actor.id === project.selectedActorId);
}

interface IActorPanelSources extends ISources {
  actor$: Stream<Actor>;
}

interface IActorPanelSinks extends ISinks {
  actorChange$: Stream<Partial<Actor>>;
  addActorToScenario$: Stream<any>;
}

function ActorPanel(sources: IActorPanelSources): IActorPanelSinks {
  const actorName$ = sources.actor$.map(actor => actor.name);
  const actorNameComponent = isolate(ProjectName)({
    ...sources,
    name$: actorName$
  });

  const nameChange$ = actorNameComponent.nameChange$.map((name: string) => ({
    name
  }));

  const widthChange$ = sources.DOM
    .select(".width")
    .events("change")
    .map(ev => parseFloat((ev.target as any).value))
    .map(width => ({ width }));

  const heightChange$ = sources.DOM
    .select(".height")
    .events("change")
    .map(ev => parseFloat((ev.target as any).value))
    .map(height => ({ height }));

  const colorChange$ = sources.DOM
    .select(".color")
    .events("change")
    .map(ev => (ev.target as any).value)
    .map(color => ({ color }));

  const addActorToScenario$ = sources.DOM
    .select(".add-to-scenario")
    .events("click");

  function view([actor, nameVtree]: [Actor, VNode]): VNode {
    return div(".actor-panel.flex-column", [
      div(".attributes.flex-column", [
        nameVtree,
        "Width",
        input(".width", { props: { value: actor.width } }),
        "Height",
        input(".height", { props: { value: actor.height } }),

        "Color",
        input(".color", { props: { value: actor.color } }),

        button(".add-to-scenario", "Add to scenario")
      ]),

      div(".sidebar-preview.flex-column", [
        "Preview",

        h(
          "svg",
          {
            attrs: { height: 300, viewBox: `-150 -150 300 300` },
            style: { background: "#222" }
          },
          [renderActor(actor, [], 0, 0, 0)]
        )
      ])
    ]);
  }

  return {
    DOM: xs.combine(sources.actor$, actorNameComponent.DOM).map(view),

    actorChange$: xs.merge(
      nameChange$,
      widthChange$,
      heightChange$,
      colorChange$
    ),

    addActorToScenario$
  };
}

function mousePositionFromEvent(ev: MouseEvent): Vector {
  return {
    x: ev.clientX,
    y: ev.clientY
  };
}

function mousePositionOnSvg(position: Vector, svg: any): Vector {
  const point = svg.createSVGPoint();

  point.x = position.x;
  point.y = position.y;

  const result = point.matrixTransform(svg.getScreenCTM().inverse());

  return {
    x: result.x,
    y: result.y
  };
}

type Reducer<T> = (t: T) => T;

interface IOnionifySources extends ISources {
  onion: StateSource<Project>;
  initialState$: Stream<Project>;
}

interface IOnionifySinks extends ISinks {
  onion: Stream<Reducer<Project>>;
  state$: Stream<Project>;
}

function ProjectWithDB(sources: ISources) {
  const projectResult$ = sources.DB.store("projects").get(sources.id);

  const initialState$ = projectResult$.filter(Boolean) as Stream<Project>;

  const project = onionify(Project)({ ...sources, initialState$ });

  const initialPersistence$ = projectResult$
    .filter((project: Project | undefined) => project === undefined)
    .mapTo($add("projects", makeProject(sources.id as string)));

  const updatePersistence$ = (project as any).state$.map((state: Project) =>
    $update("projects", state)
  );

  return {
    ...project,

    DB: xs.merge(initialPersistence$, updatePersistence$)
  };
}

function errorLevelEmoji(errorLevel: number): string {
  if (errorLevel < 2000) {
    return "😎";
  }

  if (errorLevel < 1000) {
    return "😄";
  }

  if (errorLevel < 20000) {
    return "🙂";
  }

  if (errorLevel < 30000) {
    return "🤔";
  }

  if (errorLevel < 60000) {
    return "😣";
  }

  if (errorLevel < 100000) {
    return "😖";
  }
  

  return "😵";
}

function renderErrorLevels(project: Project, errorLevels: ErrorLevels): VNode {
  return div(
    ".error-levels",
    Object.keys(errorLevels).map(actorId => {
      const actorName = (project.actors.find(
        actor => actor.id === actorId
      ) as Actor).name;

      return div(".actor-error-levels", [
        actorName,

        ...Object.keys(errorLevels[actorId]).map(scenarioId => {
          let scenarioName = "";

          if (scenarioId !== "_total") {
            const scenario = project.scenarios.find(
              scenario => scenario.id === scenarioId
            );

            scenarioName = scenario && scenario.name || "";
          } else {
            scenarioName = "Total";
          }

          return div(".error-level", [
            span(".emoji", errorLevelEmoji(errorLevels[actorId][scenarioId])),
            span(scenarioName)
          ]);
        })
      ]);
    })
  );
}

function Project(sources: IOnionifySources): IOnionifySinks {
  const project$ = sources.onion.state$;

  const nameComponent = isolate(ProjectName)({
    ...sources,
    name$: project$.map((project: any) => project.name)
  });

  const changeName$ = nameComponent.nameChange$.map(
    (name: string) => (project: any): any => ({
      ...project,
      name
    })
  );

  const record$ = sources.DOM.select(".record").events("click");
  const stopRecording$ = sources.DOM.select(".stop-recording").events("click");

  const recording$ = xs
    .merge(record$.mapTo(true), stopRecording$.mapTo(false))
    .startWith(false)
    .remember();

  const play$ = sources.DOM.select(".play").events("click");
  const pause$ = sources.DOM.select(".pause").events("click");

  const playing$ = xs
    .merge(recording$, play$.mapTo(true), pause$.mapTo(false))
    .startWith(false)
    .remember();

  const keydown$ = sources.DOM
    .select("document")
    .events("keydown")
    .map((ev: KeyboardEvent) => ev.key.toLowerCase());

  const keyup$ = sources.DOM
    .select("document")
    .events("keyup")
    .map((ev: KeyboardEvent) => ev.key.toLowerCase());

  const recordKeydown$ = keydown$
    .compose(sampleCombine(recording$))
    .map(([key, recording]) => {
      return function(project: Project): Project {
        if (!recording || project.lastInput === key) {
          return project;
        }

        if (project.keys.indexOf(key) === -1) {
          return project;
        }

        const scenario = activeScenario(project) as Scenario;

        scenario.input[project.currentFrame] =
          scenario.input[project.currentFrame] || [];

        scenario.input[project.currentFrame].push({ type: "keydown", key });

        project.lastInput = key;

        return project;
      };
    });

  const recordKeyup$ = keyup$
    .compose(sampleCombine(recording$))
    .map(([key, recording]) => {
      return function(project: Project): Project {
        if (!recording) {
          return project;
        }

        const scenario = activeScenario(project) as Scenario;

        scenario.input[project.currentFrame] =
          scenario.input[project.currentFrame] || [];

        scenario.input[project.currentFrame].push({ type: "keyup", key });

        project.lastInput = null;

        return project;
      };
    });

  const actorMouseDown$ = sources.DOM
    .select(".simulation.main .actor")
    .events("mousedown")
    .map((ev: any) => {
      const actorId = ev.target.id;

      ev.stopPropagation(); // I am evil

      return actorId;
    });

  const mouseUp$ = sources.DOM.select("document").events("mouseup");

  const clearActorSelection$ = sources.DOM
    .select(".simulation.main")
    .events("mousedown")
    .map(() => {
      return function(project: Project): Project {
        return {
          ...project,

          selectedScenarioObject: null,

          dragOffset: null
        };
      };
    });

  const mouseMove$ = sources.DOM
    .select("document")
    .events("mousemove")
    .map(mousePositionFromEvent);

  const simulationElement$ = sources.DOM
    .select(".simulation.main")
    .elements()
    .filter((elements: Element[]) => elements.length > 0)
    .map((elements: Element[]) => elements[0]);

  const animationFrame$ = sources.Time.animationFrames();

  const movingActor$ = xs.merge(actorMouseDown$.mapTo(true), mouseUp$.mapTo(false));

  const advanceFrame$ = xs.combine(playing$, recording$, movingActor$)
    .map(([playing, recording, movingActor]) =>
      animationFrame$.filter(() => playing).map(() => {
        return function(project: Project): Project {
          if (recording && !movingActor) {
            return project;
          }

          if (project.currentFrame > 60 * 8) {
            return {
              ...project,

              currentFrame: 0
            };
          }
          return {
            ...project,

            currentFrame: project.currentFrame + 1
          };
        };
      })
    )
    .flatten();

  const simulationMousePosition$ = simulationElement$
    .map((svg: any) =>
      mouseMove$.map(position => mousePositionOnSvg(position, svg))
    )
    .flatten();

  const moveActor$ = actorMouseDown$
    .map(actorId =>
      xs
        .combine(simulationMousePosition$, playing$, recording$)
        .map(([position, playing, recording]) => ({
          actorId,
          position,
          playing,
          recording
        }))
        .endWhen(mouseUp$)
    )
    .flatten()
    .map(move => {
      return function(project: Project): Project {
        const scenario = activeScenario(project);

        if (move.playing && !move.recording) {
          return project;
        }

        if (!(scenario as any).actors[move.actorId][project.currentFrame]) {
          (scenario as any).actors[move.actorId][project.currentFrame] = {
            frame: project.currentFrame,
            position: add(move.position, project.dragOffset || { x: 0, y: 0 })
          };
        } else {
          (scenario as any).actors[move.actorId][
            project.currentFrame
          ].position = add(move.position, project.dragOffset || { x: 0, y: 0 });
        }

        return { ...project };
      };
    });

  const mouseDownWithPosition$ = actorMouseDown$.compose(
    sampleCombine(simulationMousePosition$)
  );

  const selectActorInScenario$ = mouseDownWithPosition$.map(
    ([actorId, mousePosition]: [string, Vector]) => {
      return function(project: Project): Project {
        const frame = actorPosition(
          (activeScenario(project) as any).actors[actorId],
          project.currentFrame
        );

        return {
          ...project,

          selectedScenarioObject: actorId,

          dragOffset: subtract(frame.position, mousePosition)
        };
      };
    }
  );

  const addScenario$ = sources.DOM
    .select(".add-scenario")
    .events("click")
    .map(() => (project: Project): Project => {
      const scenario = makeScenario();

      return {
        ...project,

        currentFrame: 0,

        selectedScenarioId: scenario.id,

        scenarios: project.scenarios.concat(scenario)
      };
    });

  const addActor$ = sources.DOM
    .select(".add-actor")
    .events("click")
    .map(() => (project: Project): Project => {
      const actor = makeActor();

      return {
        ...project,

        actors: project.actors.concat(actor)
      };
    });

  const deleteScenario$ = sources.DOM
    .select(".delete-scenario")
    .events("click")
    .map(ev => (project: Project): Project => {
      const scenarioId = (ev.currentTarget as any).dataset.id;
      const currentlySelected = project.selectedScenarioId === scenarioId;
      const scenarios = project.scenarios.filter(scenario => scenario.id !== scenarioId);

      if (currentlySelected) {
        return {
          ...project,

          scenarios,

          currentFrame: 0,

          selectedScenarioId: scenarios[0].id
        };
      } else {
        return {
          ...project,

          scenarios
        };
      }
    });

  const selectScenario$ = sources.DOM
    .select(".select-scenario")
    .events("click")
    .map(ev => (project: Project): Project => {
      return {
        ...project,

        currentFrame: 0,

        selectedScenarioId: (ev.currentTarget as any).dataset.id
      };
    });

  const selectActor$ = sources.DOM
    .select(".select-actor")
    .events("click")
    .map(ev => (project: Project): Project => {
      return {
        ...project,

        selectedActorId: (ev.currentTarget as any).dataset.id
      };
    });

  const activeScenario$ = project$
    .map(activeScenario)
    .filter(Boolean) as Stream<Scenario>;

  const activeScenarioName$ = activeScenario$.map(scenario => scenario.name);

  const scenarioNameComponent = isolate(ProjectName)({
    ...sources,
    name$: activeScenarioName$
  });

  const timeBarElement$ = sources.DOM
    .select(".timebar")
    .elements()
    .filter((elements: Element[]) => elements.length > 0)
    .map((elements: Element[]) => elements[0]);

  const changeTimeMousedown$ = sources.DOM
    .select(".timebar")
    .events("mousedown");

  const changeTimeMouseup$ = sources.DOM.select(".timebar").events("mouseup");

  const changeTimeMousemove$ = sources.DOM
    .select(".timebar")
    .events("mousemove");

  const changeTimeEvent$ = changeTimeMousedown$
    .map(event =>
      changeTimeMousemove$.endWhen(changeTimeMouseup$).startWith(event)
    )
    .flatten();

  const changeTime$ = changeTimeEvent$
    .map(mousePositionFromEvent)
    .compose(sampleCombine(timeBarElement$))
    .map(([position, element]) => mousePositionOnSvg(position, element))
    .map(position => {
      const x = (position.x - 50) / 750;

      const frame = Math.max(0, Math.floor(8 * 60 * x));

      return function(project: Project): Project {
        if (position.x < 50) {
          return project;
        }

        return {
          ...project,

          currentFrame: frame
        };
      };
    });

  const changeScenarioName$ = scenarioNameComponent.nameChange$.map(
    (name: string) => {
      return function(project: Project): Project {
        return {
          ...project,
          scenarios: project.scenarios.map(
            (scenario: Scenario) =>
              scenario.id === project.selectedScenarioId
                ? { ...scenario, name }
                : scenario
          )
        };
      };
    }
  );

  const isActor = (actor: Actor | undefined): actor is Actor =>
    !!actor && "id" in actor;

  const activeActor$ = project$.map(selectedActor).filter(isActor);

  const actorPanel = isolate(ActorPanel)({ ...sources, actor$: activeActor$ });

  const addActorToScenario$ = actorPanel.addActorToScenario$.map(
    () =>
      function(project: Project): Project {
        const actor = selectedActor(project) as Actor;

        return {
          ...project,

          scenarios: project.scenarios.map(
            (scenario: Scenario) =>
              scenario.id === project.selectedScenarioId
                ? {
                    ...scenario,

                    selectedScenarioObject: actor.id,
                    selectedActorId: actor.id,

                    actors: {
                      ...scenario.actors,
                      [actor.id]: [{ frame: 0, position: { x: 100, y: 100 } }]
                    }
                  }
                : scenario
          )
        };
      }
  );

  const changeActorName$ = actorPanel.actorChange$.map(
    (change: Partial<Actor>) => {
      return function(project: Project): Project {
        return {
          ...project,
          actors: project.actors.map(
            (actor: Actor) =>
              actor.id === project.selectedActorId
                ? { ...actor, ...change }
                : actor
          )
        };
      };
    }
  );

  const helixPiInput$ = project$
    .compose(sources.Time.debounce(500))
    .map(project => ({
      input: projectToHelixPiInput(project),
      results: project.results
    }));

  const setResult$ = sources.HelixPi.map(
    output => (project: Project): Project => ({ ...project, results: output })
  );

  const deleteCode$ = sources.DOM.select(".delete-code").events("click").map(() => {
    return function (project: Project): Project {
      return {
        ...project,

        results: {
          entities: {},
          errorLevels: {},
          positions: {}
        }
      }
    }
  });

  const reducer$ = xs.merge(
    sources.initialState$.take(1).map(project => () => project),
    deleteCode$,
    changeName$,
    addScenario$,
    selectScenario$,
    deleteScenario$,
    changeScenarioName$,
    addActor$,
    selectActor$,
    changeActorName$,
    addActorToScenario$,
    selectActorInScenario$,
    clearActorSelection$,
    moveActor$,
    advanceFrame$,
    changeTime$,
    recordKeydown$,
    recordKeyup$,
    setResult$
  );

  const playGame$ = sources.DOM.select(".play-game").events("click");

  const id$ = project$.map(project => project.id).remember();

  const playGameRouteChange$ = id$
    .map(id => playGame$.mapTo(`/project/${id}/play`))
    .flatten();

  const routeChange$ = xs.merge(playGameRouteChange$);

  return {
    onion: reducer$,
    state$: project$,
    HelixPi: helixPiInput$,

    Router: routeChange$,

    DOM: xs
      .combine(
        project$,
        playing$,
        recording$.compose(sources.Time.delay(1)), // TODO - remove, here because otherwise stop-recording gets clicked in the same go???
        nameComponent.DOM,
        scenarioNameComponent.DOM.startWith(div()),
        actorPanel.DOM.startWith(div())
      )
      .map(
        (
          [
            project,
            playing,
            recording,
            nameVtree,
            scenarioNameVtree,
            actorPanelVtree
          ]
        ) =>
          div(".project", [
            div(".actor-sidebar.sidebar.flex-column", [
              nameVtree,
              div(".sidebar-title", "Scenarios"),
              div(".scenarios", project.scenarios.map(renderScenarioButton)),
              button(".add-scenario", "Add scenario"),

              div(".sidebar-title", "Actors"),
              div(".actors", project.actors.map(renderActorButton)),
              button(".add-actor", "Add actor"),

              div(".sidebar-title", "Play game"),
              button(".play-game", "Play"),

              div(".sidebar-title", "Code preview"),
              button(".delete-code", "Delete code"),
              renderErrorLevels(project, project.results.errorLevels)
            ]),
            div(".preview", [
              project.selectedScenarioId
                ? renderScenario(
                    project,
                    activeScenario(project) as Scenario,
                    playing,
                    recording,
                    scenarioNameVtree as VNode
                  )
                : "No scenario selected"
            ]),
            div(".sidebar.flex-column", [
              project.selectedActorId
                ? actorPanelVtree
                : "Select an actor to see details"
            ])
          ])
      )
  };
}

type Component = (sources: ISources) => ISinks;
type RouterMatch = {
  path: string;
  value: Component;
};

function extendSources(component: any, additionalSources: object) {
  return (sources: object) => component({ ...sources, ...additionalSources });
}

function view(child: VNode): VNode {
  return div(".helix-pi", [
    div(".nav-bar", ["Helix Pi", " - ", a(".home", "Home")]),
    child
  ]);
}

interface PlayerState {
  actorStates: ActorStates;
  code: Output;
  actors: Actor[];
  currentFrame: number;
}

function Player(sources: ISources): ISinks {
  const project$ = sources.DB
    .store("projects")
    .get(sources.id as string) as Stream<Project>;

  const projectState$ = project$.take(1).debug("project");

  function stateFromProject(project: Project): PlayerState {
    const actorStates: ActorStates = {};
    const x = {
      1: 400,
      0: 100,
      2: 700
    };
    project.actors.forEach((actor, index) => {
      actorStates[actor.id] = {
        velocity: { x: 0, y: 0 },
        position: { x: (x as any)[index], y: 300 },
        height: actor.height,
        width: actor.width,
        colliding: false
      };
    });

    return {
      actorStates,
      code: project.results,
      actors: project.actors,
      currentFrame: 0
    };
  }

  type KeyboardInput = { [key: string]: boolean };

  const keydown$ = sources.DOM
    .select("body")
    .events("keydown")
    .map((ev: KeyboardEvent) => (input: KeyboardInput): KeyboardInput => {
      return {
        ...input,

        [ev.key.toLowerCase()]: true
      };
    });

  const keyup$ = sources.DOM
    .select("body")
    .events("keyup")
    .map((ev: KeyboardEvent) => (input: KeyboardInput): KeyboardInput => {
      return {
        ...input,

        [ev.key.toLowerCase()]: false
      };
    });

  const input$ = xs
    .merge(keydown$, keyup$)
    .fold((input, reducer) => reducer(input), {});

  const frame$ = sources.Time.animationFrames();
  const state$ = projectState$
    .map(project =>
      frame$
        .compose(sampleCombine(input$))
        .fold(
          (state, [frame, input]) => update(state, frame, input),
          stateFromProject(project)
        )
    )
    .flatten();

  function update(
    state: PlayerState,
    frame: any,
    input: KeyboardInput
  ): PlayerState {
    frame;
    const updateActorStates = { ...state.actorStates };

    state.actors.forEach(actor => {
      updateActorStates[actor.id] = executeCode(
        actor.id,
        state.actorStates[actor.id],
        state.code.entities[actor.id],
        state.currentFrame,
        input,
        state.actorStates
      );
    });

    return {
      ...state,

      currentFrame: state.currentFrame + 1,

      actorStates: updateActorStates
    };
  }

  function renderActors(state: PlayerState): VNode {
    return div([
      pre('.debug-text', JSON.stringify(state.actorStates, null, 2)),
      h("svg", { attrs: { width: "100%", height: "100vh" } }, [
        ...state.actors.map(actor =>
          renderActor(
            actor,
            [],
            0,
            state.actorStates[actor.id].position.x,
            state.actorStates[actor.id].position.y
          )
        )
      ])
    ]);
  }

  return {
    DOM: state$.map(renderActors)
  };
}

function main(sources: ISources): ISinks {
  const page$ = sources.Router
    .define({
      "/": Home,
      "/project/:id": (id: string) => extendSources(ProjectWithDB, { id }),
      "/project/:id/play": (id: string) => extendSources(Player, { id })
    })
    .debug("page");

  const newProject$ = sources.DOM
    .select(".new-project")
    .events("click", { preventDefault: true });

  const gotoProject$ = sources.DOM
    .select(".goto-project")
    .events("click", { preventDefault: true })
    .map((ev: MouseEvent) => (ev.target as any).pathname);

  const home$ = sources.DOM
    .select(".home")
    .events("click", { preventDefault: true });

  const component$ = page$.map((result: RouterMatch) => {
    const component = result.value;

    const componentSources = {
      ...sources,

      Router: sources.Router.path(result.path)
    };

    return component(componentSources);
  });

  const componentVtree$ = component$.map((c: ISinks) => c.DOM).flatten();

  const helixPi$ = component$
    .map((c: ISinks) => c.HelixPi || xs.empty())
    .flatten();

  const componentRouteChange$ = component$
    .map((c: ISinks) => c.Router || xs.empty())
    .flatten();

  return {
    DOM: componentVtree$.map(view),

    DB: component$.map((c: ISinks) => c.DB || xs.empty()).flatten(),

    Router: xs.merge(
      home$.mapTo(`/`),
      newProject$.mapTo(`/project/${uuid.v4()}`),
      gotoProject$,
      componentRouteChange$
    ),

    HelixPi: helixPi$
  };
}

const mainWithRouter = routerify(main, switchPath, {
  historyName: "History",
  routerName: "Router"
});

function helixPiDriver(sink$: Stream<Input>) {
  const worker = work(require("./worker"));

  const driver = makeWebWorkerDriver(worker);

  const stringifiedSink$ = sink$.map(event => JSON.stringify(event));

  return driver(stringifiedSink$).map(source => JSON.parse(source));
}

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver,
  History: makeHistoryDriver(),
  DB: makeIDBDriver("helix-pi", 1, (upgradeDb: any) => {
    const projectsStore = upgradeDb.createObjectStore("projects", {
      keyPath: "id"
    });
    projectsStore.createIndex("id", "id");
  }),
  HelixPi: helixPiDriver
};

run(mainWithRouter, drivers);
