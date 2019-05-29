import {
  parse,
  generate,
  getPathAtPosition,
} from "../lib/helpers"

// import {
//   renameVariable,
//   renameFunction,
//   extractVariableIntoModule,
//   extractClassIntoModule,
//   deanonymifyClassDeclaration,
//   statefulToStatelessComponent
// } from '../lib/index'

import statefulToStatelessComponent from "../lib/statefulToStateless"
import extractClassIntoModule from "../lib/extractClassIntoModule"

describe("refactorings", () => {
  it("extractVariableIntoModule", async (done) => {
    const code = "const xxx = 1"

    const ast = parse(code)

    const moduleAst = await extractVariableIntoModule(
      ast,
      {
        row: 0,
        column: 8,
      },
      (name) => `./${name}.js`,
    )

    expect(generate(ast, code)).toEqual('import xxx from "./xxx.js";\n')
    expect(generate(moduleAst, code)).toEqual(
      "const xxx = 1;\nexport default xxx;\n",
    )
    done()
  })

  it("extractClassIntoModule", async (done) => {
    const code = `import React from 'react'
class X extends React.PureComponent {
  render() {
    return (
      <div />
    )
  }
}

export default () => <Y/>
`

    const ast = parse(code)

    const moduleAst = await extractClassIntoModule(
      ast,
      {
        row: 1,
        column: 7,
      },
      (name) => `./${name}.js`,
    )

    expect(generate(ast, code)).toEqual(`import X from \"./X.js\";

export default () => <Y />;
`)
    expect(generate(moduleAst, code)).toEqual(`import React from \"react\";
class X extends React.PureComponent {
  render() {
    return <div />;
  }
}
export default X;
`)
    done()
  })

  describe("deanonymifyClassDeclaration", () => {
    it("deanonyfies class", () => {
      const code = "const X = class {}"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      deanonymifyClassDeclaration(path)
      expect(generate(ast, code)).toEqual("class X {}\n")
    })
  })

  describe("renameVariable", () => {
    it("renames variable declarations", () => {
      const code = "const xxx = 1"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 8 })

      renameVariable(path, "yyy")
      expect(generate(ast, code)).toEqual("const yyy = 1;\n")
    })

    it("renames local variable declarations", () => {
      const code = "function func(xxx) { return xxx }"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 15 })

      renameVariable(path, "yyy")
      expect(generate(ast, code)).toEqual(
        "function func(yyy) {\n  return yyy;\n}\n",
      )
    })
  })

  describe("renameFunction", () => {
    it("renames function declarations", () => {
      const code = "function xxx() {}; xxx();"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 8 })

      renameFunction(path, "yyy")
      expect(generate(ast, code)).toEqual("function yyy() {}\nyyy();\n")
    })
  })

  describe("statefulToStatelessComponent", () => {
    it("transform statefulToStateless components", () => {
      const code = "class X extends React.Component {}"
      const ast = parse(code)

      statefulToStatelessComponent()
    })
  })
})
