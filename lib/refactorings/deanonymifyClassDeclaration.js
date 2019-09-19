"use babel"

import * as t from "@babel/types"

export default function deanonymifyClassDeclaration(path) {
  path.assertClassDeclaration()
  const varDeclPath = path.find((x) => x.isVariableDeclaration())

  varDeclPath.traverse({
    ClassExpression(classExprPath) {
      if (!classExprPath.node.id) {
        const varDecPath = classExprPath.find(
          (x) => x.isVariableDeclaration() && x.node.declarations.length === 1,
        )

        const d = varDecPath.node.declarations[0]

        varDeclPath.replaceWith(
          t.classDeclaration(d.id, d.init.superClass, d.init.body),
        )
      }
    },
  })
}
