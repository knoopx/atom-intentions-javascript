"use babel"

import { Range } from "atom"
import traverse from "@babel/traverse"

import { parse, generate, getPathAtIndex } from "./refactorings"
import INTENTIONS from "./intentions"

const matches = (path, target) => {
  if (typeof target === "string") {
    return path.node.type === target
  }
  return target(path)
}

const matchTarget = (path, target) => {
  let priority = 0
  let current = path

  while (current && !matches(current, target)) {
    priority -= 1
    current = current.parentPath
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

const computePriority = (pathAtCursor, match) => {
  let priority = 0
  let current = pathAtCursor

  while (current && current !== match) {
    priority -= 1
    current = current.parentPath
  }

  return priority
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
          const [targetPath, priority] = matchTarget(
            pathAtCursor,
            intention.target,
          )

          if (targetPath) {
            console.log(intention.title, priority)
          }

          return {
            targetPath,
            intention,
            priority,
          }
        })
          .filter((match) => match.targetPath)
          .map((match) => ({
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
          const nodes = []
          traverse(ast, {
            enter(p) {
              if (matchTarget(intention.target)(p)) {
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
