import {
  parse,
  generate,
  getPathAtIndex,
  sortKeys,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("sortKeys", () => {
    it("sorts object keys", () => {
      const code = "const x = {b: 2, a: 1}"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 14)

      sortKeys(path.find((n) => n.isObjectExpression()))
      expect(generate(ast)).toEqual("const x = {a: 1, b: 2}")
    })
  })
})
