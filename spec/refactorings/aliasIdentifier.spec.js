import {
  parse,
  generate,
  getPathAtIndex,
  renameIdentifier,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("renameIdentifier", () => {
    it("renames variable declarations", () => {
      const code = "const xxx = 1\nconsole.log(xxx)"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 8)
      const identifierPath = path.find((p) => p.isIdentifier())

      renameIdentifier(identifierPath, "yyy")
      expect(generate(ast)).toEqual("const yyy = 1\nconsole.log(yyy)")
    })

    it("renames local variable declarations", () => {
      const code = "function func(xxx) { return xxx }"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 15)
      const identifierPath = path.find((p) => p.isIdentifier())

      renameIdentifier(identifierPath, "yyy")
      expect(generate(ast)).toEqual("function func(yyy) { return yyy }")
    })

    it("renames function declarations", () => {
      const code = "function xxx() {} xxx()"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 12)
      const identifierPath = path.find((p) => p.isIdentifier())

      renameIdentifier(identifierPath, "yyy")
      expect(generate(ast)).toEqual("function yyy() {} yyy()")
    })
  })
})
