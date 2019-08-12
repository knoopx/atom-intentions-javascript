"use babel"

import * as t from "@babel/types"
import template from "@babel/template"

import { splitExportDeclaration, addNamedImport } from "./helpers"

const wrapWithDecorators = (expr, decorators = []) => {
  return decorators
    .reverse()
    .reduce(
      (result, decorator) =>
        t.callExpression(decorator.expression, [result].filter(Boolean)),
      expr,
    )
}

const lifecycleMethods = [
  "constructor",
  "render",
  "componentWillMount",
  "componentDidMount",
  "componentWillReceiveProps",
  "shouldComponentUpdate",
  "componentWillUpdate",
  "componentDidUpdate",
  "componentWillUnmount",
  "componentDidCatch",
  "getDerivedStateFromProps",
]

const RemoveThisVisitor = {
  MemberExpression(path) {
    if (t.isThisExpression(path.node.object)) {
      path.replaceWith(path.node.property)
    }
  },
}

const arrowFunction = ({
  name,
  params = [],
  paramDefaults = [],
  body = [],
}) => {
  const identifier = t.identifier(name)

  return t.variableDeclaration("const", [
    t.variableDeclarator(
      identifier,
      t.arrowFunctionExpression(
        params.map((param, idx) => {
          const paramIdentifier = t.identifier(param)

          let paramObj = paramIdentifier

          if (paramDefaults[idx]) {
            paramObj = t.assignmentPattern(paramIdentifier, paramDefaults[idx])
          }

          return paramObj
        }),
        t.blockStatement(body),
      ),
    ),
  ])
}

export default function statefulToStateless(path) {
  path.assertClassDeclaration()
  const statelessComponentName = path.node.id.name

  const stateProperties = new Map()
  const statelessFunctionBody = []
  let defaultPropsPath
  const effectBody = []
  let effectTeardown
  let propTypes
  let render

  const { decorators } = path.node

  path.traverse({
    ClassProperty(p) {
      if (t.isArrowFunctionExpression(p.node.value)) {
        p.traverse(RemoveThisVisitor)
        statelessFunctionBody.push(
          template("const NAME = EXPR")({
            NAME: p.node.key.name,
            EXPR: p.node.value,
          }),
        )
      } else if (p.node.key.name === "propTypes") {
        propTypes = p
      } else if (p.node.key.name === "defaultProps") {
        defaultPropsPath = p
      } else {
        statelessFunctionBody.unshift(
          template("const NAME = VALUE")({
            NAME: p.node.key.name,
            VALUE: wrapWithDecorators(p.node.value, p.node.decorators),
          }),
        )
      }
    },
    ClassMethod(p) {
      if (p.node.kind === "constructor") {
        const { expression } =
          p.node.body.body.find((bodyStatement) =>
            t.isAssignmentExpression(bodyStatement.expression),
          ) || {}

        if (expression && expression.left.property.name === "state") {
          expression.right.properties.forEach(({ key, value }) => {
            stateProperties.set(key.name, value)
          })
        }
      } else if (
        ["componentWillMount", "componentDidMount"].includes(p.node.key.name)
      ) {
        p.traverse(RemoveThisVisitor)
        effectBody.push(...p.node.body.body)
      } else if (p.node.key.name === "componentWillUnmount") {
        p.traverse(RemoveThisVisitor)
        effectTeardown = p.node.body
      } else if (p.node.key.name === "render") {
        p.traverse(RemoveThisVisitor)
        render = p.node.body.body
      } else if (!lifecycleMethods.includes(p.node.key.name)) {
        p.traverse(RemoveThisVisitor)
        if (p.node.kind === "method") {
          statelessFunctionBody.push(
            t.variableDeclaration("const", [
              t.variableDeclarator(
                p.node.key,
                t.arrowFunctionExpression(p.node.params, p.node.body),
              ),
            ]),
          )
        } else if (p.node.kind === "get") {
          statelessFunctionBody.push(
            template("const NAME = (() => {VALUE})()")({
              NAME: p.node.key.name,
              VALUE: p.node.body.body,
            }),
          )
        }
      }
    },
  })

  if (render) {
    statelessFunctionBody.push(...render)
  }

  const statelessComponent = arrowFunction({
    name: statelessComponentName,
    params: ["props"],
    propType:
      path.node.superTypeParameters &&
      path.node.superTypeParameters.params.length
        ? path.node.superTypeParameters.params
        : null,
    paramDefaults: defaultPropsPath ? [defaultPropsPath.node.value] : [],
    body: statelessFunctionBody,
  })

  if (propTypes) {
    path.insertAfter(
      t.expressionStatement(
        t.assignmentExpression(
          "=",
          t.memberExpression(
            statelessComponent.declarations[0].id,
            propTypes.node.key,
          ),
          propTypes.node.value,
        ),
      ),
    )
  }

  const isExportDefaultDeclaration = t.isExportDefaultDeclaration(
    path.container,
  )

  if (isExportDefaultDeclaration) {
    const parentPath = path.find((p) => t.isExportDeclaration(p))

    const exportDecl = splitExportDeclaration(parentPath)
    exportDecl.declaration = wrapWithDecorators(
      exportDecl.declaration,
      decorators,
    )
    parentPath.replaceWith(statelessComponent)
  } else {
    statelessComponent.declarations.forEach((decl) => {
      decl.init = wrapWithDecorators(decl.init, decorators)
    })
    path.replaceWith(statelessComponent)
  }

  if (effectBody.length > 0 || effectTeardown) {
    const expressions = []

    if (effectBody.length > 0) {
      expressions.push(...effectBody)
    }

    if (effectTeardown) {
      expressions.push(
        t.returnStatement(t.arrowFunctionExpression([], effectTeardown)),
      )
    }

    const importName = addNamedImport(path, "useEffect", "react")
    const lifecycleEffectHook = template(`
    NAME(() =>  { EFFECT });
    `)({ NAME: importName, EFFECT: expressions })

    lifecycleEffectHook.expression.arguments.push(t.arrayExpression([]))

    statelessFunctionBody.unshift(lifecycleEffectHook)
  }
}
