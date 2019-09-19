import { parse, getPathAtIndex } from "../lib/refactorings"

export function parseFixture(input) {
  let position = 0
  const result = input.replace(/<<([^>]+)>>/, (match, capture, index) => {
    position = index
    return capture
  })

  const ast = parse(result)
  const astPath = getPathAtIndex(ast, position)

  return [ast, astPath]
}
