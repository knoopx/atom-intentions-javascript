import {
  parse,
  generate,
  getPathAtIndex,
  aliasIdentifier,
  extractIntoModule,
  functionToArrowFunction,
  deanonymifyClassDeclaration,
  sortKeys,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("extractVariableIntoModule", () => {
    it("constants", async (done) => {
      const code = "const xxx = 1"

      const ast = parse(code)
      const cursorPath = getPathAtIndex(ast, 6)
      const path = cursorPath.find(
        (p) =>
          p.isClassDeclaration() ||
          p.isFunctionDeclaration() ||
          p.isVariableDeclarator(),
      )

      const moduleAst = await extractIntoModule(path, (name) => `./${name}.js`)

      expect(generate(ast)).toEqual('import xxx from "./xxx"')
      expect(generate(moduleAst)).toEqual("const xxx = 1\nexport default xxx")
      done()
    })

    it("functions", async (done) => {
      const code = "function x() {}"

      const ast = parse(code)
      const path = getPathAtIndex(ast, 11)
      const moduleAst = await extractIntoModule(path, (name) => `./${name}.js`)

      expect(generate(ast)).toEqual('import x from "./x"')
      expect(generate(moduleAst)).toEqual("export default function x() {}")
      done()
    })

    it("classes", async (done) => {
      const code = `import React from "react"
import Z from "z"
class X extends React.PureComponent {
  render() {
    return (
      <Z />
    )
  }
}

export default () => <X />`
      const ast = parse(code)
      const cursorPath = getPathAtIndex(ast, 51)
      const path = cursorPath.find(
        (n) => n.isClassDeclaration() || n.isFunctionDeclaration(),
      )
      const moduleAst = await extractIntoModule(path, (name) => `./${name}.js`)

      expect(generate(ast)).toEqual(`import X from "./X"
import React from "react"
import Z from "z"

export default () => <X />`)
      expect(generate(moduleAst)).toEqual(`import React from "react"
import Z from "z"

export default class X extends React.PureComponent {
  render() {
    return (
      <Z />
    )
  }
}`)

      done()
    })
  })
})
