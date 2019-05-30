"use babel"

import path from "path"

import {
  generate,
  getPathAtPosition,
  extractClassIntoModule,
  extractVariableIntoModule,
  renameIdentifier,
  statefulToStateless,
  isReactClassDeclaration,
} from "./refactorings"
import { prompt } from "./views"

// https://octicons.github.com/

const INTENTIONS = [
  {
    priority: 100,
    icon: "pencil",
    title: "Rename identifier",
    runnable: ({ textEditor, ast }) => {
      const cursorPath = getPathAtPosition(ast, textEditor.getCursorBufferPosition())

      return cursorPath && cursorPath.find((p) => p.isIdentifier())
    },
    selected: async ({ textEditor, ast }) => {
      const cursorPath = getPathAtPosition(ast, textEditor.getCursorBufferPosition())

      if (cursorPath) {
        const identifierPath = cursorPath.find((p) => p.isIdentifier())

        renameIdentifier(identifierPath, await prompt("New name...", identifierPath.node.name))
        textEditor.setText(generate(ast, textEditor.getText()))
      }
    },
  },
  {
    priority: 100,
    icon: "file-symlink-file",
    title: "Extract variable as module default export",
    runnable: ({ textEditor, ast }) => {
      const point = textEditor.getCursorBufferPosition()
      const cursorPath = getPathAtPosition(ast, point)

      if (cursorPath) {
        return cursorPath.isIdentifier() && cursorPath.find((n) => n.isVariableDeclaration())
      }

      return false
    },
    selected: async ({ textEditor, ast }) => {
      const grammar = textEditor.getGrammar()
      const extension = path.extname(textEditor.getPath())
      const point = textEditor.getCursorBufferPosition()
      let filePath
      const moduleAst = await extractVariableIntoModule(
        ast,
        point,
        async (name) => {
          const [projectPath, relativePath] = atom.project.relativizePath(
            path.dirname(textEditor.getPath()),
          )
          const defaultFilename = path.join(relativePath, name + extension)

          filePath = await prompt("New module filename", defaultFilename)

          return filePath
        },
      )
      const pane = await atom.workspace.open(filePath)
      const newEditor = atom.workspace.getActiveTextEditor()

      newEditor.setGrammar(grammar)
      pane.setText(generate(moduleAst, textEditor.getText()))
      textEditor.setText(generate(ast, textEditor.getText()))
    },
  },
  {
    priority: 100,
    icon: "file-symlink-file",
    title: "Extract class as module default export",
    runnable: ({ textEditor, ast }) => {
      const point = textEditor.getCursorBufferPosition()
      const cursorPath = getPathAtPosition(ast, point)

      if (cursorPath) { return cursorPath.isIdentifier() && cursorPath.find((n) => n.isClassDeclaration()) }

      return false
    },
    selected: async ({ textEditor, ast }) => {
      const grammar = textEditor.getGrammar()
      const extension = path.extname(textEditor.getPath())
      const point = textEditor.getCursorBufferPosition()
      let filePath
      const moduleAst = await extractClassIntoModule(
        ast,
        point,
        async (name) => {
          const [projectPath, relativePath] = atom.project.relativizePath(
            path.dirname(textEditor.getPath()),
          )
          const defaultFilename = path.join(relativePath, name + extension)

          filePath = await prompt("New module filename", defaultFilename)

          return filePath
        },
      )
      const pane = await atom.workspace.open(filePath)
      const newEditor = atom.workspace.getActiveTextEditor()

      newEditor.setGrammar(grammar)
      pane.setText(generate(moduleAst, textEditor.getText()))
      textEditor.setText(generate(ast, textEditor.getText()))
    },
  },

  {
    priority: 100,
    icon: "git-compare",
    title: "Transform into stateless component",
    runnable: ({ textEditor, ast }) => {
      const position = textEditor.getCursorBufferPosition()
      const cursorPath = getPathAtPosition(ast, position)

      return cursorPath && cursorPath.find(isReactClassDeclaration)
    },
    selected: async ({ textEditor, ast }) => {
      const position = textEditor.getCursorBufferPosition()
      const cursorPath = getPathAtPosition(ast, position)
      const classDecl = cursorPath.find(isReactClassDeclaration)

      statefulToStateless(classDecl)
      textEditor.setText(generate(ast, textEditor.getText()))
    },
  },
]

export default INTENTIONS
