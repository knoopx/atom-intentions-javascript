"use babel"

import * as t from "@babel/types"
import * as babel from "@babel/parser"
import traverse from "@babel/traverse"
import { format } from "prettier"
import { transformFromAstSync } from "@babel/core"

export const isReactClassDeclaration = (p) => {
  const supportedComponents = ["Component", "PureComponent"]

  return (p.isClassDeclaration() && p.node.superClass
    && (p.node.superClass.object
        && p.node.superClass.object.name === "React"
        && supportedComponents.includes(p.node.superClass.property.name) || supportedComponents.includes(p.node.superClass.name)
    ))
}

export function getReactImportReference(path) {
  return path.find((p) => (
    t.isImportDeclaration(p) && p.source.value === "react"
  ))
}

export function isExportedDeclaration(ast) {
  return t.isExportNamedDeclaration(ast) || t.isExportDefaultDeclaration(ast)
}

export function generate(ast, code) {
  return format(transformFromAstSync(ast, code, {
    retainLines: true,
  }).code, {
    semi: false,
  })
}

export function parse(text) {
  return babel.parse(text, {
    sourceType: "module",
    plugins: [
      "asyncGenerators",
      "classProperties",
      "decorators-legacy",
      "doExpressions",
      "dynamicImport",
      "exportExtensions",
      "flow",
      "functionBind",
      "functionSent",
      "jsx",
      "objectRestSpread",
    ],
  })
}

const isPointWithinLoc = (point, loc) => (
  point.row >= loc.start.line - 1
    && point.row <= loc.end.line - 1
    && point.column >= loc.start.column
    && point.column <= loc.end.column
)

export function getPathAtPosition(ast, cursor) {
  let match

  traverse(ast, {
    enter(path) {
      if (isPointWithinLoc(cursor, path.node.loc)) {
        match = path
      }
    },
  })

  return match
}
