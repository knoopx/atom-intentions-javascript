"use babel"

import { Range } from "atom"

import { parse, getPathAtIndex } from "./refactorings"
import INTENTIONS from "./intentions"

const flatMap = (a, f) => a.map(f).reduce((xs, ys) => [...xs, ...ys])

export default {
  provideIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        const { textEditor } = props
        const ast = parse(textEditor.getBuffer().getText())
        const pathAtCursor = getPathAtIndex(
          ast,
          textEditor
            .getBuffer()
            .characterIndexForPosition(textEditor.getCursorBufferPosition()),
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
        const buffer = textEditor.getBuffer()
        const ast = parse(buffer.getText())
        const pathAtCursor = getPathAtIndex(
          ast,
          buffer.characterIndexForPosition(
            textEditor.getCursorBufferPosition(),
          ),
        )

        if (!pathAtCursor) return []

        const matches = INTENTIONS.map((intention) => [
          intention,
          intention.highlight ? intention.highlight({ ...props, ast }) : [],
        ])

        const ranges = flatMap(
          matches.filter(([_, paths]) => paths),
          ([{ prepare, apply, ...intentionProps }, paths]) =>
            paths
              .filter((p) => {
                // ignore multi-line
                const { start, end } = p.node
                const startPoint = buffer.positionForCharacterIndex(start)
                const endPoint = buffer.positionForCharacterIndex(end)
                return startPoint.row === endPoint.row
              })
              .map((path) => {
                const { start, end } = path.node

                const range = Range.fromObject([
                  buffer.positionForCharacterIndex(start),
                  buffer.positionForCharacterIndex(end),
                ])

                return {
                  ...intentionProps,
                  range,
                  created: ({ textEditor, element, marker, matchedText }) => {
                    // element.style.color = matchedText
                    // element.style.fontWeight = "bold"
                  },
                }
              }),
        )

        return ranges
      },
    }
  },
}
