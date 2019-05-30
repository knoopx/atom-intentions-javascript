import {
  parse,
  generate,
  getPathAtPosition,
  extractVariableIntoModule,
  extractClassIntoModule,
  deanonymifyClassDeclaration,
  statefulToStateless,
} from "../lib/refactorings"

describe("refactorings", () => {
  it("example", () => {
    const code = `class X extends React.Component {
  x = 1
}
`
    const ast = parse(code)
    const path = getPathAtPosition(ast, { row: 0, column: 6 })

    statefulToStateless(path.find((p) => p.isClassDeclaration()))
    expect(generate(ast, code)).toEqual("")
  })
})
