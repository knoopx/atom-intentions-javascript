import {
  parse,
  generate,
  getPathAtPosition,
  renameVariable,
  renameFunction,
  extractVariableIntoModule,
  extractClassIntoModule,
  deanonymifyClassDeclaration
} from "../lib/refactoring";

describe("refactorings", () => {
  it("extractVariableIntoModule", async function(done) {
    const code = `const xxx = 1`;

    const ast = parse(code);

    const moduleAst = await extractVariableIntoModule(
      ast,
      {
        row: 0,
        column: 8
      },
      function(name) {
        return "./" + name + ".js";
      }
    );

    expect(generate(ast, code)).toEqual('import xxx from "./xxx.js";\n');
    expect(generate(moduleAst, code)).toEqual(
      "const xxx = 1;\nexport default xxx;\n"
    );
    done();
  });

  it("extractClassIntoModule", async function(done) {
    const code = `import React from 'react'
class X extends React.PureComponent {
  render() {
    return (
      <div />
    )
  }
}

export default () => <Y/>
`;

    const ast = parse(code);

    const moduleAst = await extractClassIntoModule(
      ast,
      {
        row: 1,
        column: 7
      },
      function(name) {
        return "./" + name + ".js";
      }
    );

    expect(generate(ast, code)).toEqual(`import X from \"./X.js\";

export default () => <Y />;
`);
    expect(generate(moduleAst, code)).toEqual(`import React from \"react\";
class X extends React.PureComponent {
  render() {
    return <div />;
  }
}
export default X;
`);
    done();
  });

  describe("deanonymifyClassDeclaration", () => {
    it("deanonyfies class", () => {
      const code = `const X = class {}`;
      const ast = parse(code);
      const path = getPathAtPosition(ast, { row: 0, column: 7 });
      deanonymifyClassDeclaration(path);
      expect(generate(ast, code)).toEqual("class X {}\n");
    });
  });

  describe("renameVariable", () => {
    it("renames variable declarations", function() {
      const code = `const xxx = 1`;
      const ast = parse(code);
      const path = getPathAtPosition(ast, { row: 0, column: 8 });
      renameVariable(path, "yyy");
      expect(generate(ast, code)).toEqual("const yyy = 1;\n");
    });

    it("renames local variable declarations", function() {
      const code = `function func(xxx) { return xxx }`;
      const ast = parse(code);
      const path = getPathAtPosition(ast, { row: 0, column: 15 });
      renameVariable(path, "yyy");
      expect(generate(ast, code)).toEqual(
        `function func(yyy) {\n  return yyy;\n}\n`
      );
    });
  });

  describe("renameFunction", () => {
    it("renames function declarations", function() {
      const code = `function xxx() {}; xxx();`;
      const ast = parse(code);
      const path = getPathAtPosition(ast, { row: 0, column: 8 });
      renameFunction(path, "yyy");
      expect(generate(ast, code)).toEqual("function yyy() {}\nyyy();\n");
    });
  });
});
