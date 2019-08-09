import {
  parse,
  generate,
  getPathAtIndex,
  deanonymifyClassDeclaration,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("deanonymifyClassDeclaration", () => {
    it("deanonyfies class", () => {
      const code = "const X = class {}"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      deanonymifyClassDeclaration(path)
      expect(generate(ast)).toEqual("class X {}")
    })
  })
})
