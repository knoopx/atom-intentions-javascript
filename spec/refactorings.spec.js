import {
  parse,
  generate,
  getPathAtPosition,
  renameIdentifier,
  extractVariableIntoModule,
  extractClassIntoModule,
  deanonymifyClassDeclaration,
  statefulToStateless,
} from "../lib/refactorings"

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

    expect(generate(ast, code)).toEqual('import xxx from "./xxx.js"\n')
    expect(generate(moduleAst, code)).toEqual(
      "const xxx = 1\nexport default xxx\n",
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

    expect(generate(ast, code)).toEqual(`import X from "./X.js"

export default () => <Y />
`)
    expect(generate(moduleAst, code)).toEqual(`import React from "react"
class X extends React.PureComponent {
  render() {
    return <div />
  }
}
export default X
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

  describe("renameIdentifier", () => {
    it("renames variable declarations", () => {
      const code = "const xxx = 1\nconsole.log(xxx)"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 8 })
      const identifierPath = path.find((p) => p.isIdentifier())

      renameIdentifier(identifierPath, "yyy")
      expect(generate(ast, code)).toEqual("const yyy = 1\nconsole.log(yyy)\n")
    })

    it("renames local variable declarations", () => {
      const code = "function func(xxx) { return xxx }"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 15 })
      const identifierPath = path.find((p) => p.isIdentifier())

      renameIdentifier(identifierPath, "yyy")
      expect(generate(ast, code)).toEqual(
        "function func(yyy) {\n  return yyy\n}\n",
      )
    })

    it("renames function declarations", () => {
      const code = "function xxx() {} xxx()"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 12 })
      const identifierPath = path.find((p) => p.isIdentifier())

      renameIdentifier(identifierPath, "yyy")
      expect(generate(ast, code)).toEqual("function yyy() {}\nyyy()\n")
    })
  })

  describe("statefulToStateless", () => {
    it("transform simple components", () => {
      const code = "class X extends React.Component {}"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual("const X = props => {}\n")
    })

    it("transform lifecycle methods", () => {
      const code = `class X extends React.Component {
             componentDidMount(){
               console.log("mount")
             }
             componentWillUnmount(){
               console.log("unmount")
             }
           }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual(`const X = props => {
  useEffect(() => {
    console.log("mount")
    return () => {
      console.log("unmount")
    }
  }, [])
}
`)
    })

    it("transform static props", () => {
      const code = `class X extends React.Component {
             static propTypes = { a: PropType.string.required }
           }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 1, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual(`const X = props => {}
X.propTypes = { a: PropType.string.required }
`)
    })

    it("transforms decorators", () => {
      const code = `@inject("x") @observer
          class X extends React.Component {
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 1, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual("const X = observer(inject(\"x\")(props => {}))\n")
    })

    it("preseves export", () => {
      const code = `export class X extends React.Component {
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 14 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual("export const X = props => {}\n")
    })

    it("preseves default export", () => {
      const code = `export default class X extends React.Component {
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 22 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))

      expect(generate(ast, code)).toEqual("const X = props => {}\nexport default X\n")
    })

    it("transforms render", () => {
      const code = `class X extends React.Component {
            render(){
              const {a} = this.props
              return a
            }
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual(`const X = props => {
  const { a } = props
  return a
}
`)
    })

    it("keeps methods", () => {
      const code = `class X extends React.Component {
            handleClick(){
              console.log("click")
            }
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast, code)).toEqual(`const X = props => {
  const handleClick = () => {
    console.log("click")
  }
}
`)
    })
  })
})
