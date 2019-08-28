"use babel"

import { sortBy } from "lodash"

export default function sortKeys(arrayExpressionPath) {
  // console.log(elements)
  arrayExpressionPath.node.elements = sortBy(
    arrayExpressionPath.node.elements,
    ["type", "value"],
  )
}
