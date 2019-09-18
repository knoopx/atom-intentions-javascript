import { parse, generate, getPathAtIndex } from "../lib/refactorings"

const fs = require("fs")
const path = require("path")

const yaml = require("js-yaml")
const fg = require("fast-glob")

const refactorings = fg.sync(
  path.resolve(__dirname, "../lib/refactorings/*.js"),
)

describe("refactorings", () => {
  refactorings.forEach((file) => {
    const basename = path.basename(file, ".js")
    const specFile = path.resolve(
      __dirname,
      `../spec/refactorings/${basename}.spec.yaml`,
    )

    if (fs.existsSync(specFile)) {
      const { default: module } = require(file)
      const specs = yaml.load(fs.readFileSync(specFile, "utf-8"))
      describe(basename, () => {
        specs.forEach((spec) => {
          it(spec.name, () => {
            let position
            const input = spec.input.replace(
              /<<([^>]+)>>/,
              (match, capture, index) => {
                position = index
                return capture
              },
            )
            expect(position).not.toBeNull()
            const ast = parse(input)
            const astPath = getPathAtIndex(ast, position)
            module(astPath, ...(spec.arguments || []))
            expect(generate(ast)).toEqual(spec.output)
          })
        })
      })
    }
  })
})
