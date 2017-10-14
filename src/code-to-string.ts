import { Entity } from "./index";

function indent(str: string, indentLevel: number): string {
  const lines = str.split('\n');

  return lines.map(line => Array(indentLevel * 2).fill(' ').join('') + line).join('\n');
}

export function codeToString(entity: Entity, indentLevel = 0): string {
  if (entity.type === "sequence") {
    return indent(entity.children.map(codeToString).filter(a => a.trim() !== "").join("\n"), indentLevel);
  }

  if (entity.type === "onCreate") {
    return indent(
`on("create", {
${codeToString(entity.children[0], 1)}
})`, indentLevel);
  }
  if (entity.type === "inputConditional") {
    if (entity.children[1].type === "noop") {
      return indent(
`if keyDown("${entity.key}") {
${codeToString(entity.children[0], 1)}
}`, indentLevel);
    }

    if (entity.children[1].type !== "noop") {
      return indent(
`if keyDown("${entity.key}") {
${codeToString(entity.children[0], 1)}
} else {
${codeToString(entity.children[1], 1)}
}`, indentLevel);
    }
  }

  if (entity.type === "collisionConditional") {
    if (entity.children[1].type === "noop") {
      return indent(
`if collision() {
${codeToString(entity.children[0], 1)}
}`, indentLevel);
    }

    if (entity.children[1].type !== "noop") {
      return indent(
`if collision() {
${codeToString(entity.children[0], 1)}
} else {
${codeToString(entity.children[1], 1)}
}`, indentLevel);
    }
  }
  if (entity.type === "move") {
    return indent(`move(${entity.direction}, ${entity.amount})`, indentLevel);
  }

  if (entity.type === "setVelocity") {
    return indent(`setVelocity(${entity.velocity.x}, ${entity.velocity.y})`, indentLevel);
  }
  if (entity.type === "noop") {
    return ``;
  }

  return JSON.stringify(entity);
}
