"use babel"

import {
  generate,
  sortKeys,
  sortArrayValues,
  functionToArrowFunction,
  renameIdentifier,
  statefulToStateless,
  isReactClassDeclaration,
  importToRequire,
  stringToTemplate,
} from "./refactorings"
import { prompt } from "./views"

// https://octicons.github.com/

const INTENTIONS = [
  {
    icon: "git-compare",
    title: "Transform to arrow function",
    target: ["FunctionDeclaration"],
    transform: functionToArrowFunction,
  },
  {
    icon: "pencil",
    title: "Rename identifier",
    target: ["Identifier"],
    apply: async ({ textEditor, ast, path }) => {
      renameIdentifier(path, await prompt("New name...", path.node.name))
      textEditor.setText(generate(ast))
    },
  },
  {
    icon: "pencil",
    title: "Sort Object Keys",
    target: ["ObjectExpression"],
    transform: sortKeys,
  },
  {
    icon: "pencil",
    title: "Sort Array Values",
    target: ["ArrayExpression"],
    transform: sortArrayValues,
  },
  {
    icon: "git-compare",
    title: "Transform into require statement",
    target: ["ImportDeclaration"],
    transform: importToRequire,
  },
  {
    icon: "git-compare",
    title: "Transform component into stateless component",
    target: [isReactClassDeclaration],
    transform: statefulToStateless,
  },
  {
    icon: "git-compare",
    title: "Transform into Template Literal",
    target: ["StringLiteral"],
    transform: stringToTemplate,
  },
]

export default INTENTIONS
