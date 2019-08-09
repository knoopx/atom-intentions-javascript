import {
  parse,
  generate,
  getPathAtPosition,
  aliasIdentifier,
  extractIntoModule,
  functionToArrowFunction,
  deanonymifyClassDeclaration,
  statefulToStateless,
  sortKeys,
} from "../lib/refactorings"

describe("refactorings", () => {
  it("functionToArrow", () => {
    const code = `
function x(a, ...args) {
  console.log("hello")
}
    `
    const ast = parse(code)

    const cursorPath = getPathAtPosition(ast, { row: 1, column: 10 })
    const path = cursorPath.find((p) => p.isFunctionDeclaration())

    functionToArrowFunction(path)

    expect(generate(ast)).toEqual(`const x = (a, ...args) => {
  console.log("hello")
}
`)
  })

  it("extractVariableIntoModule", async (done) => {
    const code = "const xxx = 1"

    const ast = parse(code)
    const cursorPath = getPathAtPosition(ast, { row: 0, column: 6 })
    const path = cursorPath.find(
      (p) =>
        p.isClassDeclaration() ||
        p.isFunctionDeclaration() ||
        p.isVariableDeclarator(),
    )

    const moduleAst = await extractIntoModule(path, (name) => `./${name}.js`)

    expect(generate(ast)).toEqual('import xxx from "./xxx"\n')
    expect(generate(moduleAst)).toEqual("const xxx = 1\nexport default xxx\n")
    done()
  })

  it("extractVariableIntoModule", async (done) => {
    const code = "function x() {}"

    const ast = parse(code)
    const path = getPathAtPosition(ast, { row: 0, column: 11 })
    const moduleAst = await extractIntoModule(path, (name) => `./${name}.js`)

    expect(generate(ast)).toEqual('import x from "./x"\n')
    expect(generate(moduleAst)).toEqual("export default function x() {}\n")
    done()
  })

  it("extractClassIntoModule", async (done) => {
    const code = `import React from 'react'
import Z from 'z'
class X extends React.PureComponent {
  render() {
    return (
      <Z />
    )
  }
}

export default () => <X/>
`
    const ast = parse(code)
    const cursorPath = getPathAtPosition(ast, { row: 2, column: 6 })
    const path = cursorPath.find(
      (n) => n.isClassDeclaration() || n.isFunctionDeclaration(),
    )
    const moduleAst = await extractIntoModule(path, (name) => `./${name}.js`)

    expect(generate(ast)).toEqual(`import X from "./X"
import React from "react"
import Z from "z"

export default () => <X />
`)
    expect(generate(moduleAst)).toEqual(`import React from "react"
import Z from "z"
export default class X extends React.PureComponent {
  render() {
    return <Z />
  }
}
`)

    done()
  })

  describe("deanonymifyClassDeclaration", () => {
    it("deanonyfies class", () => {
      const code = "const X = class {}"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      deanonymifyClassDeclaration(path)
      expect(generate(ast)).toEqual("class X {}\n")
    })
  })

  describe("sortKeys", () => {
    it("sorts object keys", () => {
      const code = "const x = {b: 2, a: 1}"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 14 })

      sortKeys(path.find((n) => n.isObjectExpression()))
      expect(generate(ast)).toEqual("const x = { a: 1, b: 2 }\n")
    })
  })

  describe("aliasIdentifier", () => {
    it("renames variable declarations", () => {
      const code = "const xxx = 1\nconsole.log(xxx)"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 8 })
      const identifierPath = path.find((p) => p.isIdentifier())

      aliasIdentifier(identifierPath, "yyy")
      expect(generate(ast)).toEqual("const yyy = 1\nconsole.log(yyy)\n")
    })

    it("renames local variable declarations", () => {
      const code = "function func(xxx) { return xxx }"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 15 })
      const identifierPath = path.find((p) => p.isIdentifier())

      aliasIdentifier(identifierPath, "yyy")
      expect(generate(ast)).toEqual("function func(yyy) {\n  return yyy\n}\n")
    })

    it("renames function declarations", () => {
      const code = "function xxx() {} xxx()"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 12 })
      const identifierPath = path.find((p) => p.isIdentifier())

      aliasIdentifier(identifierPath, "yyy")
      expect(generate(ast)).toEqual("function yyy() {}\nyyy()\n")
    })
  })

  describe("statefulToStateless", () => {
    it("transform simple components", () => {
      const code = "class X extends React.Component {}"
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual("const X = props => {}\n")
    })

    it("transform lifecycle methods", () => {
      const code = `import React from "react"\nclass X extends React.Component {
             componentDidMount(){
               console.log("mount")
             }
             componentWillUnmount(){
               console.log("unmount")
             }
           }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 1, column: 7 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast))
        .toEqual(`import React, { useEffect } from "react"\nconst X = props => {
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
      expect(generate(ast)).toEqual(`const X = props => {}
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
      expect(generate(ast)).toEqual(
        'const X = inject("x")(observer(props => {}))\n',
      )
    })

    it("preseves export", () => {
      const code = `export class X extends React.Component {
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 14 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual("export const X = props => {}\n")
    })

    it("preseves default export", () => {
      const code = `export default class X extends React.Component {
          }`
      const ast = parse(code)
      const path = getPathAtPosition(ast, { row: 0, column: 22 })

      statefulToStateless(path.find((p) => p.isClassDeclaration()))

      expect(generate(ast)).toEqual("const X = props => {}\nexport default X\n")
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
      expect(generate(ast)).toEqual(`const X = props => {
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
      expect(generate(ast)).toEqual(`const X = props => {
  const handleClick = () => {
    console.log("click")
  }
}
`)
    })
  })
})
