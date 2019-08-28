"use babel"

import * as t from "@babel/types"

export default function stringToTemplate(stringLiteralPath) {
  const { value } = stringLiteralPath.node
  stringLiteralPath.replaceWithSourceString(`\`${value}\``)
}
