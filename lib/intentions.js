"use babel"

import Path from "path"

import {
  generate,
  sortKeys,
  sortArrayValues,
  functionToArrowFunction,
  renameIdentifier,
  statefulToStateless,
  extractIntoModule,
  importToRequire,
  stringToTemplate,
  removeUnusedImports,
} from "./refactorings"
import { prompt } from "./views"

// https://octicons.github.com/

const INTENTIONS = [
  {
    icon: "git-compare",
    title: "Transform to arrow function",
    selector: "FunctionDeclaration > Identifier",
    transform: functionToArrowFunction,
  },
  {
    icon: "pencil",
    title: "Remove unused imports",
    selector: "Program",
    transform: removeUnusedImports,
  },
  {
    icon: "pencil",
    title: "Rename identifier",
    selector: "Identifier",
    apply: async ({ textEditor, ast, path }) => {
      renameIdentifier(path, await prompt("New name...", path.node.name))
      textEditor.setText(generate(ast))
    },
  },
  {
    icon: "pencil",
    title: "Sort Object Keys",
    selector: "ObjectExpression > Property",
    transform: sortKeys,
  },
  {
    icon: "pencil",
    title: "Sort Array Values",
    selector: "ArrayExpression",
    transform: sortArrayValues,
  },
  {
    icon: "git-compare",
    title: "Transform into require statement",
    selector: "ImportDeclaration",
    transform: importToRequire,
  },
  {
    icon: "git-compare",
    title: "Transform component into stateless component",
    selector: `ClassDeclaration[superClass.object.name="React"]
      :matches(
        [superClass.property.name="Component"],
        [superClass.property.name="Component"]
      )`,
    transform: statefulToStateless,
  },
  {
    icon: "git-compare",
    title: "Transform into Template Literal",
    selector: "StringLiteral",
    transform: stringToTemplate,
  },
  {
    icon: "pencil",
    title: "Extract into module",
    selector: ":declaration",
    apply: async ({ textEditor, ast, path }) => {
      const grammar = textEditor.getGrammar()
      const extension = Path.extname(textEditor.getPath())

      // force re-opening of pending tab
      atom.workspace.open(atom.workspace.getActiveTextEditor().getPath(), {
        pending: false,
      })

      const dirname = Path.dirname(textEditor.getPath())
      const [projectPath, relativePath] = atom.project.relativizePath(dirname)

      const defaultModulePath = Path.join(
        relativePath,
        path.node.name + extension,
      )

      const newFilePath = await prompt(
        "New module filename",
        defaultModulePath,
        [
          relativePath.length + 1,
          relativePath.length + 1 + path.node.name.length,
        ],
      )

      const moduleRelativePath = [
        ".",
        Path.relative(Path.join(dirname), Path.join(projectPath, newFilePath)),
      ]
        .join(Path.sep)
        .replace(/\.[^/.]+$/, "")

      const moduleAst = await extractIntoModule(path, moduleRelativePath)

      textEditor.setText(generate(ast))
      const newEditor = await atom.workspace.open(newFilePath)
      newEditor.setGrammar(grammar)
      newEditor.setText(generate(moduleAst))
    },
  },
]

export default INTENTIONS
