'use babel'

// import * as babel from 'babel'
import * as babel from "@babel/parser";
import traverse from '@babel/traverse'
import g from '@babel/generator'
import * as t from '@babel/types'
import { addDefault } from '@babel/helper-module-imports'
import { format } from 'prettier'

export function generate(ast, code) {
  return format(
    g(
      ast,
      {
        retainLines: true,
        retainFunctionParens: true,
      },

      code,
    ).code,
  )
}

export function parse(text) {
  return babel.parse(text, {
    sourceType: 'module',
    plugins: [
      'asyncGenerators',
      'classProperties',
      'decorators-legacy',
      'doExpressions',
      'dynamicImport',
      'exportExtensions',
      'flow',
      'functionBind',
      'functionSent',
      'jsx',
      'objectRestSpread',
    ],
  })
}


const isPointWithinLoc = (point, loc) => {
  return (
    point.row >= loc.start.line - 1 &&
    point.row <= loc.end.line - 1 &&
    point.column >= loc.start.column &&
    point.column <= loc.end.column
  )
}

export function getPathAtPosition(ast, cursor) {
  let match
  traverse(ast, {
    enter(path) {
      if (isPointWithinLoc(cursor, path.node.loc)) {
        match = path
      }
    },
  })

  return match
}

export function renameVariable(identifierPath, newName) {
  identifierPath.scope.rename(identifierPath.node.name, newName)
}

export function renameFunction(identifierPath, newName) {
  identifierPath.scope.parent.rename(identifierPath.node.id.name, newName)
}

export async function extractVariableIntoModule(ast, cursor, getFilename) {
  const identifierPath = getPathAtPosition(ast, cursor)
  if (!identifierPath) {
    throw new Error(
      'Unable to find a valid identifier at ' +
        cursor.row +
        ':' +
        cursor.column,
    )
  }
  const varDeclPath = identifierPath.find((n) => n.isVariableDeclaration())
  if (varDeclPath) {
    const moduleAst = t.program([
      varDeclPath.node,
      t.exportDefaultDeclaration(identifierPath.node),
    ])

    identifierPath
      .find((n) => n.isProgram())
      .unshiftContainer(
        'body',
        t.importDeclaration(
          [t.importDefaultSpecifier(identifierPath.node)],
          t.stringLiteral(await getFilename(identifierPath.node.name)),
        ),
      )

    varDeclPath.remove()
    return moduleAst
  } else {
    throw new Error('Unable to find variable declaration')
  }
}

export async function extractClassIntoModule(ast, cursor, getFilename) {
  const identifierPath = getPathAtPosition(ast, cursor)
  if (!identifierPath) {
    throw new Error(
      'Unable to find a valid identifier at ' +
        cursor.row +
        ':' +
        cursor.column,
    )
  }
  const classDeclPath = identifierPath.find((n) => n.isClassDeclaration())
  if (classDeclPath) {
    const moduleAst = t.program([
      classDeclPath.node,
      t.exportDefaultDeclaration(identifierPath.node),
    ])

    identifierPath
      .find((n) => n.isProgram())
      .unshiftContainer(
        'body',
        t.importDeclaration(
          [t.importDefaultSpecifier(identifierPath.node)],
          t.stringLiteral(await getFilename(identifierPath.node.name)),
        ),
      )
      
    const bindings = classDeclPath.scope.getAllBindings()
    Object.keys(bindings)
      .reverse()
      .filter((name) =>
        bindings[name].referencePaths.some((ref) =>
          ref.find((x) => x === classDeclPath),
        ),
      )
      .forEach((name) => {
        const binding = bindings[name]
        const dec = binding.path.getStatementParent()
        if (dec) {
          moduleAst.body.unshift(t.cloneNode(dec.node))
          if (binding.references === 1) {
            binding.path.remove()
          }
          if (
            dec.node &&
            dec.node.specifiers &&
            dec.node.specifiers.length === 0
          ) {
            dec.remove()
          }
        }
      })

    classDeclPath.remove()
    return moduleAst
  } else {
    throw new Error('Unable to find class declaration')
  }
}

export function deanonymifyClassDeclaration(path) {
  const varDeclPath = path.find((x) => x.isVariableDeclaration())
  varDeclPath.traverse({
    ClassExpression(classExprPath) {
      if (!classExprPath.node.id) {
        const varDecPath = classExprPath.find(
          (x) => x.isVariableDeclaration() && x.node.declarations.length === 1,
        )

        const d = varDecPath.node.declarations[0]
        varDeclPath.replaceWith(
          t.classDeclaration(d.id, d.init.superClass, d.init.body),
        )
      }
    },
  })
}