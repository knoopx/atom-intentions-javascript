"use babel"

import * as t from "@babel/types"
import * as babel from "@babel/parser"
import traverse from "@babel/traverse"
import g from "@babel/generator"
import { addDefault } from "@babel/helper-module-imports"
import { format } from "prettier"

export function getReactImportReference(ast) {
  return ast.program.body.find((statement) => (
    t.isImportDeclaration(statement) && statement.source.value === "react"
  ))
}

export function isExportedDeclaration(ast) {
  return t.isExportNamedDeclaration(ast) || t.isExportDefaultDeclaration(ast)
}

export function generate(ast, code) {
  return format(
    g(
      ast,
      {
        retainLines: true,
        retainFunctionParens: true,
      },

      code,
    ).code,
  )
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
