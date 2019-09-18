"use babel"

import * as t from "@babel/types"

const namedToDefaultExport = (path) => {
  path.assertExportNamedDeclaration()
  const declaration = path.get("declaration")
  const [{ id }] = declaration.node.declarations
  path.replaceWith(declaration)
  path.insertAfter(t.exportDefaultDeclaration(id))
}

export default namedToDefaultExport
