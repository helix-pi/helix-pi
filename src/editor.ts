import { makeDOMDriver, h1, h2, div, a, DOMSource, VNode } from "@cycle/dom";
import { makeHistoryDriver } from "@cycle/history";
import { timeDriver, TimeSource } from "@cycle/time";
import { run } from "@cycle/run";
import { routerify, RouterSource, RouterSink } from "cyclic-router";
import switchPath from "switch-path";
import xs, { Stream } from "xstream";

interface ISources {
  DOM: DOMSource;
  Time: TimeSource;
  Router: RouterSource;
  ID: IDSource;
  id?: string;
}

interface ISinks {
  DOM: Stream<VNode>;
  Router?: RouterSink;
}

function initialView(): VNode {
  return div(".welcome", [
    h1("Helix Pi"),

    div(".options", [
      a(".new-project", { attrs: { href: "#" } }, "Create new project"),

      div(".recent-projects", [
        h2("Recent projects"),
        div("TODO"),
        div("Implement this")
      ])
    ])
  ]);
}

function Home(): ISinks {
  return {
    DOM: xs.of(initialView())
  };
}

function Project(sources: ISources): ISinks {
  sources;
  return {
    DOM: xs.of(div(".project", [div(`Project: ${sources.id}`)]))
  };
}

type Component = (sources: ISources) => ISinks;
type RouterMatch = {
  path: string;
  value: Component;
};

function extendSources (component: any, additionalSources: object) {
  return (sources: object) => component({...sources, ...additionalSources});
}

function main(sources: ISources): ISinks {
  sources;
  const page$ = sources.Router.define({
    "/": Home,
    "/project/:id": (id: string) => extendSources(Project, {id})
  });

  const newProject$ = sources.DOM
    .select(".new-project")
    .events("click", { preventDefault: true });

  const component$ = page$.map((result: RouterMatch) => {
    const component = result.value;

    const componentSources = {
      ...sources,

      Router: sources.Router.path(result.path)
    };

    return component(componentSources);
  });

  return {
    DOM: component$.map((c: ISinks) => c.DOM).flatten(),

    Router: xs.merge(newProject$.map(() => `/project/untitled-${sources.ID()}`))
  };
}

const mainWithRouter = routerify(main, switchPath, {
  historyName: "History",
  routerName: "Router"
});

type IDSource = () => number;

function idDriver(): IDSource {
  let _id = 0;

  return () => _id++;
}

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver,
  History: makeHistoryDriver(),
  ID: idDriver
};

run(mainWithRouter, drivers);
