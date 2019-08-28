import {
  parse,
  generate,
  getPathAtIndex,
  stringToTemplate,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("stringToTemplate", () => {
    it("sorts object keys", () => {
      const code = "const x = '${value}'"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 14)

      stringToTemplate(path.find((n) => n.isStringLiteral()))
      expect(generate(ast)).toEqual("const x = `${value}`")
    })
  })
})
