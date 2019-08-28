import {
  parse,
  generate,
  getPathAtIndex,
  sortArrayValues,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("sortArrayValues", () => {
    it("sorts object keys", () => {
      const code = "const x = ['c', 'b', 'd', 'a']"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 12)

      sortArrayValues(path.find((n) => n.isArrayExpression()))
      expect(generate(ast)).toEqual("const x = ['a', 'b', 'c', 'd']")
    })
  })
})
