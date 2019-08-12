"use babel"

import { arrowFunction } from "./helpers"

const functionToArrowFunction = (path) => {
  path.assertFunctionDeclaration()
  path.replaceWith(
    arrowFunction({
      NAME: path.node.id.name,
      PARAMS: path.node.params,
      BODY: path.node.body,
    }),
  )
}

export default functionToArrowFunction
