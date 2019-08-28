import {
  parse,
  generate,
  getPathAtIndex,
  importToRequire,
} from "../../lib/refactorings"

describe("refactorings", () => {
  describe("importToRequire", () => {
    it("transforms default imports", () => {
      const code = "import React from 'react'"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 3)

      importToRequire(path.find((n) => n.isImportDeclaration()))
      expect(generate(ast)).toEqual("const React = require('react')")
    })

    it("transforms named imports", () => {
      const code = "import { useState } from 'react'"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 3)

      importToRequire(path.find((n) => n.isImportDeclaration()))
      expect(generate(ast)).toEqual(`const {
  useState
} = require('react')`)
    })

    it("transforms namespace imports", () => {
      const code = "import * as React from 'react'"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 3)

      importToRequire(path.find((n) => n.isImportDeclaration()))
      expect(generate(ast)).toEqual("const React = require('react')")
    })

    it("transforms default imports, destructs named imports", () => {
      const code = "import React, { useState } from 'react'"
      const ast = parse(code)
      const path = getPathAtIndex(ast, 3)

      importToRequire(path.find((n) => n.isImportDeclaration()))
      expect(generate(ast)).toEqual(`const React = require('react')

const {
  useState
} = React`)
    })
  })
})
