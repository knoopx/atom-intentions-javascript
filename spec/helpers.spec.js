import traverse from "@babel/traverse"

import {
  parse,
  generate,
  addDefaultImport,
  addNamedImport,
} from "../lib/refactorings/helpers"

describe("helpers", () => {
  it("adds imports", () => {
    const code = ""
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addDefaultImport(path, "React", "react")
      },
    })

    expect(generate(ast, code)).toEqual("import React from \"react\"\n")
  })

  it("adds imports", () => {
    const code = "import {useEffect} from 'react'"
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addDefaultImport(path, "React", "react")
      },
    })

    expect(generate(ast, code)).toEqual("import React, { useEffect } from \"react\"\n")
  })

  it("adds imports", () => {
    const code = ""
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addNamedImport(path, "useEffect", "react")
      },
    })

    expect(generate(ast, code)).toEqual("import { useEffect } from \"react\"\n")
  })

  it("modifies existing imports", () => {
    const code = "import React from 'react'"
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addNamedImport(path, "map", "lodash")
      },
    })

    expect(generate(ast, code)).toEqual(`import React from "react"
import { map } from "lodash"
`)
  })

  it("modifies existing imports", () => {
    const code = "import React from 'react'"
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addNamedImport(path, "useEffect", "react")
      },
    })

    expect(generate(ast, code)).toEqual("import React, { useEffect } from \"react\"\n")
  })
})
