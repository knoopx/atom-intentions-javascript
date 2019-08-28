"use babel"

import * as t from "@babel/types"
import template from "@babel/template"

const buildRequire = template(`const %%name%% = require(%%source%%);`)
const buildNamed = template(`const %%names%% = %%source%%;`)

const importSpecifiersToObjectPattern = (specs) => {
  return t.objectPattern(
    specs.map((n) =>
      t.objectProperty(n.node.imported, n.node.imported, false, true),
    ),
  )
}

const destructImportSpecifiers = (specs, source) => {
  return buildNamed({
    names: importSpecifiersToObjectPattern(specs),
    source,
  })
}

export default function importToRequire(importDeclarationPath) {
  const { source } = importDeclarationPath.node
  const specifiers = importDeclarationPath.get("specifiers")

  let defaultSpec
  const specs = []

  if (specifiers) {
    specifiers.forEach((spec) => {
      if (
        spec.isImportDefaultSpecifier() ||
        spec.isImportNamespaceSpecifier()
      ) {
        defaultSpec = spec
      } else {
        specs.push(spec)
      }
    })
  }

  if (defaultSpec) {
    importDeclarationPath.replaceWith(
      buildRequire({
        name: defaultSpec.node.local,
        source: defaultSpec.parent.source,
      }),
    )
    if (specs.length > 0) {
      importDeclarationPath.insertAfter(
        destructImportSpecifiers(specs, defaultSpec.node.local),
      )
    }
  } else if (specs.length > 0) {
    importDeclarationPath.replaceWith(
      buildRequire({
        name: importSpecifiersToObjectPattern(specs),
        source,
      }),
    )
  }
}
