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

    expect(generate(ast)).toEqual('import React from "react"')
  })

  it("prepends default imports", () => {
    const code = 'import {useEffect} from "react"'
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addDefaultImport(path, "React", "react")
      },
    })

    expect(generate(ast)).toEqual('import React, { useEffect } from "react"')
  })

  it("adds named imports", () => {
    const code = ""
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addNamedImport(path, "useEffect", "react")
      },
    })

    expect(generate(ast)).toEqual('import { useEffect } from "react"')
  })

  it("keeps existing imports", () => {
    const code = 'import React from "react"'
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addNamedImport(path, "map", "lodash")
      },
    })

    expect(generate(ast)).toEqual(`import React from "react"
import { map } from "lodash"`)
  })

  it("appends named imports", () => {
    const code = 'import React from "react"'
    const ast = parse(code)

    traverse(ast, {
      Program(path) {
        addNamedImport(path, "useEffect", "react")
      },
    })

    expect(generate(ast)).toEqual('import React, { useEffect } from "react"')
  })
})
