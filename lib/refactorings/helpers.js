"use babel"

import * as t from "@babel/types"
import template from "@babel/template"
import * as babel from "@babel/parser"
import traverse from "@babel/traverse"
import { format } from "prettier"
import { transformFromAstSync } from "@babel/core"

// export const addDefaultImport(){
// }

export const findImportDeclaration = (path, sourceName) => {
  const programPath = path.find((p) => p.isProgram())
  let match

  programPath.traverse({
    ImportDeclaration(p) {
      if (p.node.source.value === sourceName) {
        match = p
        p.stop()
      }
    },
  })

  return match
}

export const findImportDefaultSpecifier = (path, name) => {
  let match

  path.traverse({
    ImportDefaultSpecifier(p) {
      match = p
      p.stop()
    },
  })

  return match
}

export const findImportSpecifier = (path, name) => {
  let match

  path.traverse({
    ImportSpecifier(p) {
      match = p
      p.stop()
    },
  })

  return match
}

export const addNamedImport = (path, name, source) => {
  const programPath = path.find((p) => p.isProgram())
  const existingImport = findImportDeclaration(path, source)


  if (existingImport) {
    const specifier = findImportSpecifier(existingImport, name)

    if (specifier) {
      return specifier.node.local.name
    }

    existingImport.node.specifiers.push(t.importSpecifier(
      t.identifier(name),
      t.identifier(name),
    ))

    return name
  }

  const importDecl = template("import NAME from \"SOURCE\"")({ NAME: name, SOURCE: source })

  programPath.get("body").push(importDecl)

  return name
}

export function splitExportDeclaration(exportDeclaration) {
  if (!exportDeclaration.isExportDeclaration()) {
    throw new Error("Only export declarations can be splitted.")
  }

  // build specifiers that point back to this export declaration
  const isDefault = exportDeclaration.isExportDefaultDeclaration()
  const declaration = exportDeclaration.get("declaration")
  const isClassDeclaration = declaration.isClassDeclaration()

  if (isDefault) {
    const standaloneDeclaration = declaration.isFunctionDeclaration() || isClassDeclaration

    const scope = declaration.isScope()
      ? declaration.scope.parent
      : declaration.scope

    let { id } = declaration.node

    let needBindingRegistration = false

    if (!id) {
      needBindingRegistration = true

      id = scope.generateUidIdentifier("default")

      if (
        standaloneDeclaration
        || declaration.isFunctionExpression()
        || declaration.isClassExpression()
      ) {
        declaration.node.id = t.cloneNode(id)
      }
    }

    const updatedDeclaration = standaloneDeclaration
      ? declaration
      : t.variableDeclaration("var", [
        t.variableDeclarator(t.cloneNode(id), declaration.node),
      ])

    const updatedExportDeclaration = t.exportDefaultDeclaration(t.cloneNode(id))

    exportDeclaration.insertAfter(updatedExportDeclaration)
    exportDeclaration.replaceWith(updatedDeclaration)

    if (needBindingRegistration) {
      scope.registerDeclaration(exportDeclaration)
    }

    return exportDeclaration
  }

  if (exportDeclaration.get("specifiers").length > 0) {
    throw new Error("It doesn't make sense to split exported specifiers.")
  }

  const bindingIdentifiers = declaration.getOuterBindingIdentifiers()

  const specifiers = Object.keys(bindingIdentifiers).map((name) => t.exportSpecifier(t.identifier(name), t.identifier(name)))

  const aliasDeclar = t.exportNamedDeclaration(null, specifiers)

  exportDeclaration.insertAfter(aliasDeclar)
  exportDeclaration.replaceWith(declaration.node)

  return exportDeclaration
}

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
