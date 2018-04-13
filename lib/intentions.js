'use babel'

import path from 'path'

import {
  parse,
  generate,
  getPathAtPosition,
  extractClassIntoModule,
  extractVariableIntoModule,
  renameVariable,
  renameFunction,
} from './refactoring'

import { prompt } from './views'

// https://octicons.github.com/

const INTENTIONS = [
  {
    priority: 100,
    icon: 'pencil',
    title: 'Rename variable',
    runnable: ({ textEditor, ast }) => {
      const path = getPathAtPosition(ast, textEditor.getCursorBufferPosition())
      return (
        path &&
        path.isIdentifier() &&
        path.find((x) => x.isVariableDeclaration())
      )
    },
    selected: async ({ textEditor, ast }) => {
      const path = getPathAtPosition(ast, textEditor.getCursorBufferPosition())
      renameVariable(path, await prompt('New name...', path.node.name))
      textEditor.setText(generate(ast, textEditor.getText()))
    },
  },
  {
    priority: 100,
    icon: 'pencil',
    title: 'Rename function',
    runnable: ({ textEditor, ast }) => {
      const path = getPathAtPosition(ast, textEditor.getCursorBufferPosition())
      return (
        path &&
        path.isIdentifier() &&
        path.find((x) => x.isFunctionDeclaration())
      )
    },
    selected: async ({ textEditor, ast }) => {
      const path = getPathAtPosition(ast, textEditor.getCursorBufferPosition())
      renameFunction(path, await prompt('New name...', path.node.id.name))
      textEditor.setText(generate(ast, textEditor.getText()))
    },
  },
  {
    priority: 100,
    icon: 'file-symlink-file',
    title: 'Extract variable as module default export',
    runnable: ({ textEditor, ast }) => {
      const point = textEditor.getCursorBufferPosition()
      const path = getPathAtPosition(ast, point)
      if (!path) {
        throw new Error(
          'Unable to find a valid identifier at ' +
            cursor.row +
            ':' +
            cursor.column,
        )
      }
      return path.isIdentifier() && path.find((n) => n.isVariableDeclaration())
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
          filePath = await prompt('New module filename', defaultFilename)
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
    icon: 'file-symlink-file',
    title: 'Extract class as module default export',
    runnable: ({ textEditor, ast }) => {
      const point = textEditor.getCursorBufferPosition()
      const path = getPathAtPosition(ast, point)
      if (!path) {
        throw new Error(
          'Unable to find a valid identifier at ' +
            cursor.row +
            ':' +
            cursor.column,
        )
      }
      return path.isIdentifier() && path.find((n) => n.isClassDeclaration())
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
          filePath = await prompt('New module filename', defaultFilename)
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
]

export default INTENTIONS

// const checkpoint = textEditor.createCheckpoint()
// textEditor.setTextInBufferRange(range, template)
// const rows = template.split('\n')
// const start = range[0]
// const firstRow = start[0]
// const lastRow = start[0] + rows.length
// textEditor.autoIndentBufferRows(firstRow, lastRow)
// for (let row = firstRow; row < lastRow; row += 1) {
//   if (buffer.isRowBlank(row)) {
//     textEditor.setSelectedBufferRange([
//       [row, 0],
//       [row, buffer.lineLengthForRow(row)],
//     ])
//     textEditor.delete()
//   }
// }
// textEditor.groupChangesSinceCheckpoint(checkpoint)
