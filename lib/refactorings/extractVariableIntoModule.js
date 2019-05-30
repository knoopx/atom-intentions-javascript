"use babel"

import * as t from "@babel/types"

import { getPathAtPosition } from "./helpers"

export default async function extractVariableIntoModule(ast, cursor, getFilename) {
  const identifierPath = getPathAtPosition(ast, cursor)

  if (!identifierPath) {
    throw new Error(
      `Unable to find a valid identifier at ${
        cursor.row
      }:${
        cursor.column}`,
    )
  }
  const varDeclPath = identifierPath.find((n) => n.isVariableDeclaration())

  if (varDeclPath) {
    const moduleAst = t.program([
      varDeclPath.node,
      t.exportDefaultDeclaration(identifierPath.node),
    ])

    identifierPath
      .find((n) => n.isProgram())
      .unshiftContainer(
        "body",
        t.importDeclaration(
          [t.importDefaultSpecifier(identifierPath.node)],
          t.stringLiteral(await getFilename(identifierPath.node.name)),
        ),
      )

    varDeclPath.remove()

    return moduleAst
  }
  throw new Error("Unable to find variable declaration")
}
