/* eslint-disable spaced-comment */

import traverse from "@babel/traverse"
import { matches, parse } from "esquery"

import { generate } from "./lib/refactorings/helpers"
import { parseFixture } from "./spec/helpers"

const [ast, pathAtCursor] = parseFixture(`
class <<x>> extends React.PureComponent {}
const z = () => {}
`)

const matchSelector = (path, selector) => {
  let priority = 0
  let current = path

  while (current && !matches(current.node, parse(selector))) {
    current = current.parentPath
    priority -= 1
  }

  return [current, priority]
}

traverse(ast, {
  Program(path) {
    const [match, priority] = matchSelector(pathAtCursor, "ClassDeclaration")
    console.log({ match: generate(match.node), priority })
  },
})
