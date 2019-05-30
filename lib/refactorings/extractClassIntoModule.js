"use babel"

import * as t from "@babel/types"

import { getPathAtPosition } from "./helpers"

export default async function extractClassIntoModule(ast, cursor, getFilename) {
  const identifierPath = getPathAtPosition(ast, cursor)

  if (!identifierPath) {
    throw new Error(
      `Unable to find a valid identifier at ${
        cursor.row
      }:${
        cursor.column}`,
    )
  }
  const classDeclPath = identifierPath.find((n) => n.isClassDeclaration())

  if (classDeclPath) {
    const moduleAst = t.program([
      classDeclPath.node,
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

    const bindings = classDeclPath.scope.getAllBindings()

    Object.keys(bindings)
      .reverse()
      .filter((name) =>
        bindings[name].referencePaths.some((ref) =>
          ref.find((x) => x === classDeclPath)))
      .forEach((name) => {
        const binding = bindings[name]
        const dec = binding.path.getStatementParent()

        if (dec) {
          moduleAst.body.unshift(t.cloneNode(dec.node))
          if (binding.references === 1) {
            binding.path.remove()
          }
          if (
            dec.node
            && dec.node.specifiers
            && dec.node.specifiers.length === 0
          ) {
            dec.remove()
          }
        }
      })

    classDeclPath.remove()

    return moduleAst
  }
  throw new Error("Unable to find class declaration")
}
