"use babel"

import { Range } from "atom"
import traverse from "@babel/traverse"

import { parse, generate, getPathAtIndex } from "./refactorings"
import INTENTIONS from "./intentions"

const matchesTarget = (target) => (path) => {
  return target.some((t) => {
    if (typeof t === "string") {
      return path.node.type === t
    }
    return t(path)
  })
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

        return INTENTIONS.map((intention) => {
          const targetPath = matchesTarget(intention.target)(pathAtCursor)
            ? pathAtCursor
            : null
          return {
            targetPath,
            intention,
          }
        })
          .filter((match) => match.targetPath)
          .map((match) => ({
            title: match.intention.title,
            icon: match.intention.icon,
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
          const nodes = []
          traverse(ast, {
            enter(p) {
              if (matchesTarget(intention.target)(p)) {
                if (p.node) {
                  nodes.push(p.node)
                }
              }
            },
          })
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
