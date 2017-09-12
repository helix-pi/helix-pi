import { Entity } from "./index";

export function codeToString(entity: Entity): string {
  if (entity.type === "sequence") {
    return entity.children.map(codeToString).join("\n");
  }

  if (entity.type === "inputConditional") {
    if (entity.children[1].type === "noop") {
      return `
if keyDown("${entity.key}") {
  ${codeToString(entity.children[0])}
}
      `;
    }

    if (entity.children[1].type !== "noop") {
      return `
if keyDown("${entity.key}") {
  ${codeToString(entity.children[0])}
} else {
  ${codeToString(entity.children[1])}
}
      `;
    }
  }

  if (entity.type === "moveUp") {
    return "moveUp()";
  }

  if (entity.type === "moveDown") {
    return "moveDown()";
  }

  return JSON.stringify(entity);
}
