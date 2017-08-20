import {
  makeDOMDriver,
  h1,
  h2,
  span,
  div,
  input,
  a,
  h,
  button,
  DOMSource,
  VNode
} from "@cycle/dom";
import { makeHistoryDriver } from "@cycle/history";
import isolate from "@cycle/isolate";
import makeIDBDriver, { $add, $update } from "cycle-idb";
import { timeDriver, TimeSource } from "@cycle/time";
import { run } from "@cycle/run";
import { routerify, RouterSource, RouterSink } from "cyclic-router";
import switchPath from "switch-path";
import * as uuid from "uuid";
import xs, { Stream } from "xstream";

import { Scenario } from "./index";

interface Project {
  id: string;
  name: string;
  selectedScenarioId: null | string;
  selectedActorId: null | string;

  scenarios: Scenario[];
  actors: Actor[];
}

interface Actor {
  id: string;
  name: string;

  width: number;
  height: number;
  color: string;
}

interface ISources {
  DOM: DOMSource;
  Time: TimeSource;
  Router: RouterSource;
  DB: any;
  id?: string;
}

interface ISinks {
  DOM: Stream<VNode>;
  Router?: RouterSink;
  DB?: any;
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
    id: uuid.v4(),
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
    id: uuid.v4()
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
    selectedActorId: null
  };
}

function renderScenarioButton(scenario: Scenario): VNode {
  return div(".scenario-button", [
    a(".select-scenario", { attrs: { "data-id": scenario.id } }, scenario.name)
  ]);
}

function renderActorButton(actor: Actor): VNode {
  return div(".actor-button", [
    a(".select-actor", { attrs: { "data-id": actor.id } }, actor.name)
  ]);
}

function renderScenario(project: Project, scenario: Scenario, scenarioNameVtree: VNode): VNode {
  scenario;
  const lines = new Array(Math.ceil(800 / 50)).fill(0);

  return div(".scenario", [
    div(".scenario-name", [scenarioNameVtree]),

    h("svg", { attrs: { width: 800, height: 600 } }, [
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
            y2: 600,
            stroke: "#333"
          }
        })
      ),

      ...Object.keys(scenario.actors).map(id => {
        const actor = project.actors.find(actor => actor.id === id) as Actor;
        const frame = (scenario.actors[id] as any)[0];

        return renderActor(actor, frame.position.x, frame.position.y);
      })
    ])
  ]);
}

function renderActor(actor: Actor, x: number, y: number): VNode {
  return h("rect", {
    attrs: {
      x: x - actor.width / 2,
      y: y - actor.height / 2,
      height: actor.height,
      width: actor.width,
      fill: actor.color
    }
  });
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
    .select('.add-to-scenario')
    .events('click');

  function view([actor, nameVtree]: [Actor, VNode]): VNode {
    return div(".actor-panel.flex-column", [
      nameVtree,
      "Width",
      input(".width", { props: { value: actor.width } }),
      "Height",
      input(".height", { props: { value: actor.height } }),

      "Color",
      input(".color", { props: { value: actor.color } }),

      "Preview",

      h(
        "svg",
        {
          attrs: { width: "100%", height: 300, viewBox: `-150 -150 300 300` },
          style: { background: "#222" }
        },
        [renderActor(actor, 0, 0)]
      ),

      button(".add-to-scenario", "Add to scenario")
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

function Project(sources: ISources): ISinks {
  const projectResult$ = sources.DB.store("projects").get(sources.id);

  const project$ = projectResult$.filter(Boolean) as Stream<Project>;

  const initialPersistence$ = projectResult$
    .filter((project: Project | undefined) => project === undefined)
    .mapTo($add("projects", makeProject(sources.id as string)));

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

  const addScenario$ = sources.DOM
    .select(".add-scenario")
    .events("click")
    .map(() => (project: Project): Project => {
      const scenario = makeScenario();

      return {
        ...project,

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

  const selectScenario$ = sources.DOM
    .select(".select-scenario")
    .events("click")
    .map(ev => (project: Project): Project => {
      return {
        ...project,

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

  const addActorToScenario$ = actorPanel.addActorToScenario$.map(() =>
    function (project: Project): Project {
      const actor = selectedActor(project) as Actor;

      return {
        ...project,

          scenarios: project.scenarios.map(
            (scenario: Scenario) =>
              scenario.id === project.selectedScenarioId
                ? { ...scenario, actors: {...scenario.actors, [actor.id]: [{frame: 0, position: {x: 100, y: 100}}]}}
                : scenario
          )
      }
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

  const reducer$ = xs.merge(
    changeName$,
    addScenario$,
    selectScenario$,
    changeScenarioName$,
    addActor$,
    selectActor$,
    changeActorName$,
    addActorToScenario$
  );

  const update$ = project$
    .map(project =>
      reducer$.map((reducer: (project: Project) => Project) =>
        $update("projects", reducer(project))
      )
    )
    .flatten();

  return {
    DOM: xs
      .combine(
        project$,
        nameComponent.DOM,
        scenarioNameComponent.DOM.startWith(div()),
        actorPanel.DOM.startWith(div())
      )
      .map(
        (
          [project, nameVtree, scenarioNameVtree, actorPanelVtree]: [
            any,
            VNode,
            VNode,
            VNode
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
              button(".add-actor", "Add actor")
            ]),
            div(".preview", [
              project.selectedScenarioId
                ? renderScenario(
                    project,
                    activeScenario(project) as Scenario,
                    scenarioNameVtree
                  )
                : "No scenario selected"
            ]),
            div(".sidebar.flex-column", [
              project.selectedActorId
                ? actorPanelVtree
                : "Select an actor to see details"
            ])
          ])
      ),

    DB: xs.merge(initialPersistence$, update$)
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

function main(sources: ISources): ISinks {
  const page$ = sources.Router.define({
    "/": Home,
    "/project/:id": (id: string) => extendSources(Project, { id })
  });

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

  return {
    DOM: componentVtree$.map(view),

    DB: component$.map((c: ISinks) => c.DB || xs.empty()).flatten(),

    Router: xs.merge(
      home$.mapTo(`/`),
      newProject$.mapTo(`/project/${uuid.v4()}`),
      gotoProject$
    )
  };
}

const mainWithRouter = routerify(main, switchPath, {
  historyName: "History",
  routerName: "Router"
});

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver,
  History: makeHistoryDriver(),
  DB: makeIDBDriver("helix-pi", 1, (upgradeDb: any) => {
    const projectsStore = upgradeDb.createObjectStore("projects", {
      keyPath: "id"
    });
    projectsStore.createIndex("id", "id");
  })
};

run(mainWithRouter, drivers);
