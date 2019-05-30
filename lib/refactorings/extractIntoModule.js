"use babel"

import Path from "path"

import * as t from "@babel/types"

import { getPathBindings } from "./helpers"


export default async function extractIntoModule(path, getFilename) {
  const filename = await getFilename(path.node.id.name)
  const filePath = filename.replace(/.jsx?$/i, "")
  const programPath = path.find((n) => n.isProgram())

  let moduleAst

  if (t.isVariableDeclarator(path)) {
    const variableDeclaration = path.find((p) => p.isVariableDeclaration())

    moduleAst = t.program([
      variableDeclaration.node,
      t.exportDefaultDeclaration(path.node.id),
    ])
  } else {
    moduleAst = t.program([
      t.exportDefaultDeclaration(path.node),
    ])
  }

  getPathBindings(path).forEach((dec) => { moduleAst.body.unshift(t.cloneNode(dec.node)) })

  programPath.unshiftContainer(
    "body",
    t.importDeclaration(
      [t.importDefaultSpecifier(path.node.id)],
      t.stringLiteral(filePath),
    ),
  )

  path.remove()

  return moduleAst
}
