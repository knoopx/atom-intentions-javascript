"use babel"

import { isUsingJSX } from "./helpers"

const removeUnusedImports = (path) => {
  const programPath = path.find((p) => p.isProgram())
  const hasJSX = isUsingJSX(programPath)

  programPath.traverse({
    ImportDeclaration(importPath) {
      const specifiers = importPath.get("specifiers")
      // only process imports with local identifiers to avoid removing css imports
      if (specifiers.filter((s) => s.get("local")).length > 0) {
        specifiers.forEach((specPath) => {
          const binding = programPath.scope.getBinding(specPath.get("local"))
          if (!binding.referenced) {
            if (binding.identifier.name === "React") {
              if (!hasJSX) {
                binding.path.remove()
              }
            } else {
              binding.path.remove()
            }
          }
        })
        if (importPath.node.specifiers.length === 0) {
          importPath.remove()
        }
      }
    },
  })
}

export default removeUnusedImports
