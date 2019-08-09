import {
  parse,
  generate,
  getPathAtIndex,
  functionToArrowFunction,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("functionToArrow", () => {
    it("works", () => {
      const code = `function x(a, ...args) { console.log("hello") }`
      const ast = parse(code)

      const cursorPath = getPathAtIndex(ast, 10)
      const path = cursorPath.find((p) => p.isFunctionDeclaration())

      functionToArrowFunction(path)

      expect(generate(ast)).toEqual(
        `const x = (a, ...args) => { console.log("hello") }`,
      )
    })
  })
})
