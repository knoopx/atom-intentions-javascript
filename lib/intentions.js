"use babel"

import Path from "path"

import traverse from "@babel/traverse"

import {
  generate,
  sortKeys,
  functionToArrowFunction,
  extractIntoModule,
  renameIdentifier,
  statefulToStateless,
  isReactClassDeclaration,
  importToRequire,
} from "./refactorings"
import { prompt } from "./views"

// https://octicons.github.com/

const INTENTIONS = [
  {
    priority: 100,
    icon: "git-compare",
    title: "Transform to arrow function",
    highlight: ({ ast }) => {
      const paths = []
      traverse(ast, {
        FunctionDeclaration(p) {
          paths.push(p)
        },
      })

      return paths
    },
    prepare: ({ pathAtCursor }) =>
      pathAtCursor.find((p) => p.isFunctionDeclaration()),
    apply: ({ textEditor, ast, path }) => {
      functionToArrowFunction(path)
      textEditor.setText(generate(ast))
    },
  },

  {
    priority: 100,
    icon: "pencil",
    title: "Rename identifier",
    highlight: ({ ast }) => {
      const paths = []
      traverse(ast, {
        Identifier(p) {
          paths.push(p)
        },
      })

      return paths
    },
    prepare: ({ pathAtCursor }) => pathAtCursor.find((p) => p.isIdentifier()),
    apply: async ({ textEditor, ast, path }) => {
      renameIdentifier(path, await prompt("New name...", path.node.name))
      textEditor.setText(generate(ast))
    },
  },

  {
    priority: 100,
    icon: "pencil",
    title: "Sort Keys",
    highlight: ({ ast }) => {
      const paths = []
      traverse(ast, {
        ObjectExpression(p) {
          paths.push(p)
        },
      })

      return paths
    },
    prepare: ({ pathAtCursor }) =>
      pathAtCursor.find((p) => p.isObjectExpression()),
    apply: async ({ textEditor, ast, path }) => {
      sortKeys(path)
      textEditor.setText(generate(ast))
    },
  },

  {
    priority: 100,
    icon: "file-symlink-file",
    title: "Extract indentifier into module",
    prepare: ({ pathAtCursor }) =>
      pathAtCursor.find(
        (p) =>
          p.isVariableDeclarator() ||
          p.isClassDeclaration() ||
          p.isFunctionDeclaration(),
      ),

    apply: async ({ textEditor, ast, path }) => {
      let newFilePath
      const grammar = textEditor.getGrammar()
      const extension = Path.extname(textEditor.getPath())

      const moduleAst = await extractIntoModule(path, async (name) => {
        const dirname = Path.dirname(textEditor.getPath())
        const [projectPath, relativePath] = atom.project.relativizePath(dirname)

        newFilePath = await prompt(
          "New module filename",
          Path.join(relativePath, name + extension),
        )

        return [
          ".",
          Path.relative(
            Path.join(dirname),
            Path.join(projectPath, newFilePath),
          ),
        ].join(Path.sep)
      })

      const pane = await atom.workspace.open(newFilePath)
      const newEditor = atom.workspace.getActiveTextEditor()

      newEditor.setGrammar(grammar)
      pane.setText(generate(moduleAst, textEditor.getText()))
      textEditor.setText(generate(ast))
    },
  },
  {
    priority: 100,
    icon: "git-compare",
    title: "Transform into require statement",
    highlight: ({ ast }) => {
      const paths = []
      traverse(ast, {
        ImportDeclaration(p) {
          paths.push(p)
        },
      })
      return paths
    },
    prepare: ({ pathAtCursor }) =>
      pathAtCursor.find((p) => p.isImportDeclaration),
    apply: ({ textEditor, ast, path }) => {
      statefulToStateless(path)
      textEditor.setText(generate(ast))
    },
  },
  {
    priority: 100,
    icon: "git-compare",
    title: "Transform into stateless component",
    highlight: ({ ast }) => {
      const paths = []
      traverse(ast, {
        enter(p) {
          if (isReactClassDeclaration(p)) {
            paths.push(p)
          }
        },
      })

      return paths
    },
    prepare: ({ pathAtCursor }) => pathAtCursor.find(isReactClassDeclaration),
    apply: ({ textEditor, ast, path }) => {
      importToRequire(path)
      textEditor.setText(generate(ast))
    },
  },
]

export default INTENTIONS
