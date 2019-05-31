"use babel"

import { Range } from "atom"

import { parse, getPathAtPosition } from "./refactorings"
import INTENTIONS from "./intentions"

const flatMap = (a, f) => a.map(f).reduce((xs, ys) => [...xs, ...ys])

export default {
  provideIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        const { textEditor } = props
        const ast = parse(textEditor.getBuffer().getText())
        const pathAtCursor = getPathAtPosition(
          ast,
          textEditor.getCursorBufferPosition(),
        )

        if (!pathAtCursor) return []
        const matches = INTENTIONS.map((intention) => [
          intention,
          intention.prepare({ ...props, ast, pathAtCursor }),
        ])

        return matches
          .filter(([_, path]) => path)
          .map(([{ prepare, apply, ...intentionProps }, path]) => ({
            ...intentionProps,
            selected: () => {
              apply({ ...props, ast, path })
            },
          }))
      },
    }
  },
  highlightIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        const { textEditor } = props
        const ast = parse(textEditor.getBuffer().getText())
        const pathAtCursor = getPathAtPosition(
          ast,
          textEditor.getCursorBufferPosition(),
        )

        if (!pathAtCursor) return []

        const matches = INTENTIONS.map((intention) => [
          intention,
          intention.highlight ? intention.highlight({ ...props, ast }) : [],
        ])

        const ranges = flatMap(
          matches.filter(([_, paths]) => paths),
          ([{ prepare, apply, ...intentionProps }, paths]) =>
            paths.map((path) => {
              const { loc } = path.node

              return {
                ...intentionProps,
                range: Range.fromObject([
                  [loc.start.line - 1, loc.start.column],
                  [loc.end.line - 1, loc.end.column],
                ]),

                created: ({ textEditor, element, marker, matchedText }) => {
                  element.style.color = matchedText
                  element.style.fontWeight = "bold"
                },
              }
            }),
        )

        return ranges
      },
    }
  },
}
