"use babel"

import * as t from "@babel/types"

import { getPathBindings, isUsingJSX } from "./helpers"

export default function extractIntoModule(path, filePath) {
  const declaratorPath = path.find(
    (p) =>
      p.isVariableDeclarator() ||
      p.isFunctionDeclaration() ||
      p.isClassDeclaration(),
  )

  const moduleNode = t.program([])

  if (declaratorPath.isVariableDeclarator()) {
    moduleNode.body.push(
      t.variableDeclaration(declaratorPath.parent.kind, [declaratorPath.node]),
      t.exportDefaultDeclaration(declaratorPath.node.id),
    )
  } else {
    moduleNode.body.push(t.exportDefaultDeclaration(declaratorPath.node))
  }

  const bindings = getPathBindings(declaratorPath)

  bindings.forEach((dec) => {
    moduleNode.body.unshift(t.cloneNode(dec.node))
  })

  // add react if jsx
  if (isUsingJSX(declaratorPath)) {
    // todo: avoid importing twice
    moduleNode.body.unshift(
      t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier("React"))],
        t.stringLiteral("react"),
      ),
    )
  }

  declaratorPath
    .getStatementParent()
    .insertBefore(
      t.importDeclaration(
        [t.importDefaultSpecifier(declaratorPath.node.id)],
        t.stringLiteral(filePath),
      ),
    )

  declaratorPath.remove()

  bindings.forEach((dec) => {
    if (!dec.isReferencedIdentifier()) {
      dec.remove()
    }
  })

  return moduleNode
}
