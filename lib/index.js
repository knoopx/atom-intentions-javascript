"use babel"

import traverse from "@babel/traverse"
import { Range } from "atom"
import { parse as parseSelector } from "esquery"

import { query, matches } from "./babel-query"
import { parse, generate, getPathAtIndex } from "./refactorings"
import INTENTIONS from "./intentions"

const matchSelector = (path, selector) => {
  let priority = 0
  let current = path

  while (current && !matches(current.node, parseSelector(selector))) {
    current = current.parentPath
    priority -= 1
  }

  return [current, priority]
}

const parseFromTextEditor = (textEditor) => {
  const ast = parse(textEditor.getBuffer().getText())
  const pathAtCursor = getPathAtIndex(
    ast,
    textEditor
      .getBuffer()
      .characterIndexForPosition(textEditor.getCursorBufferPosition()),
  )
  return { ast, pathAtCursor }
}

export default {
  provideIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        const { textEditor, visibleRange } = props
        const { ast, pathAtCursor } = parseFromTextEditor(textEditor)
        if (!pathAtCursor) return []

        const intentions = []

        INTENTIONS.forEach((intention) => {
          try {
            const [targetPath, priority] = matchSelector(
              pathAtCursor,
              intention.selector,
            )

            if (targetPath) {
              intentions.push({
                targetPath,
                intention,
                priority,
              })
            }
          } catch (err) {
            // ignore
          }
        })

        return intentions.map((match) => ({
          title: match.intention.title,
          icon: match.intention.icon,
          priority: match.priority,
          selected: () => {
            if (match.intention.transform) {
              match.intention.transform(match.targetPath)
              textEditor.setText(generate(ast))
            } else {
              match.intention.apply({
                textEditor,
                ast,
                path: match.targetPath,
              })
            }
          },
        }))
      },
    }
  },
  highlightIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        const { textEditor, visibleRange } = props
        const buffer = textEditor.getBuffer()
        const { ast } = parseFromTextEditor(textEditor)

        const highlights = INTENTIONS.map((intention) => {
          let nodes = []
          try {
            traverse(ast, {
              Program(p) {
                nodes = query(p, intention.selector).map((p) => p.node)
                p.stop()
              },
            })
          } catch (err) {
            console.log(err)
            // ignore
          }

          return {
            intention,
            nodes,
          }
        })
          .filter((match) => match.nodes.length > 0)
          .reduce((result, match) => {
            const ranges = match.nodes
              .filter((node) => {
                // ignore multi-line
                const { start, end } = node
                const startPoint = buffer.positionForCharacterIndex(start)
                const endPoint = buffer.positionForCharacterIndex(end)
                return startPoint.row === endPoint.row
              })
              .map((node) => {
                const { start, end } = node
                return Range.fromObject([
                  buffer.positionForCharacterIndex(start),
                  buffer.positionForCharacterIndex(end),
                ])
              })

            return [
              ...result,
              ...ranges.map((range) => ({
                title: match.intention.title,
                range,
                created: ({ textEditor, element, marker, matchedText }) => {
                  // console.log(element)
                  // element.style.color = "yellow"
                  // element.style.fontWeight = "bold"
                  // element.style.color = matchedText
                  // element.style.fontWeight = "bold"
                },
              })),
            ]
          }, [])

        return highlights
      },
    }
  },
}
