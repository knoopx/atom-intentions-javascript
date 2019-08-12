import {
  parse,
  generate,
  getPathAtIndex,
  statefulToStateless,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("statefulToStateless", () => {
    it("transform simple components", () => {
      const code = "class X extends React.Component {}"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual("const X = props => {}")
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
      const path = getPathAtIndex(ast, 30)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast))
        .toEqual(`import React, { useEffect } from "react"\n\nconst X = props => {
  useEffect(() => {
    console.log("mount")

    return () => {
      console.log("unmount")
    }
  }, [])
}`)
    })

    it("transforms decorated class props", () => {
      const code = `class X extends React.Component { @observable propName = {} }`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(`const X = props => {
  const propName = observable({})
}`)
    })

    it("transforms empty decorated class props", () => {
      const code = `class X extends React.Component { @observable propName }`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(`const X = props => {
  const propName = observable()
}`)
    })

    it("transform static props", () => {
      const code = `class X extends React.Component {
                 static propTypes = { a: PropType.string.required }
               }`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(`const X = props => {}
X.propTypes = { a: PropType.string.required }`)
    })

    it("transforms decorators", () => {
      const code = `@inject("x") @observer
              class X extends React.Component {
              }`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(
        'const X = inject("x")(observer(props => {}))',
      )
    })

    it("splits default export decorators", () => {
      const code = `@observer
          export default class X extends React.Component {
          }`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(
        "const X = props => {}\nexport default observer(X)",
      )
    })

    it("preseves export", () => {
      const code = `export class X extends React.Component {}`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 14)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual("export const X = props => {}")
    })

    it("preseves default export", () => {
      const code = `export default class X extends React.Component {
              }`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 22)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))

      expect(generate(ast)).toEqual("const X = props => {}\nexport default X")
    })

    it("transforms render", () => {
      const code = `class X extends React.Component {
  render(){
    const {a} = this.props
    return a
  }
}`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 7)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(`const X = props => {
  const {a} = props
  return a
}`)
    })

    it("keeps methods", () => {
      const code = `class X extends React.Component {
  handleClick(e){
    console.log("click")
  }
}`
      const ast = parse(code)
      const path = getPathAtIndex(ast, 3)

      statefulToStateless(path.find((p) => p.isClassDeclaration()))
      expect(generate(ast)).toEqual(`const X = props => {
  const handleClick = e => {
    console.log("click")
  }
}`)
    })
  })
})
