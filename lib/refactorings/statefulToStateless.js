"use babel"

import traverse from "@babel/traverse"
import template from "@babel/template"
import * as t from "@babel/types"
import { transformFromAst } from "@babel/core"

import { getReactImportReference, isExportedDeclaration } from "./helpers"

const buildStateHook = template(`
const [STATE_PROP, STATE_SETTER] = useState(STATE_VALUE);
`)

const buildEffectHook = template(`
useEffect(() =>  { EFFECT });
`)

export default function statefulToStateless(component) {
  const functionBody = []
  const stateProperties = new Map()

  const RemoveThisVisitor = {
    MemberExpression(path) {
      if (t.isThisExpression(path.node.object)) {
        path.replaceWith(path.node.property)
      }
    },
  }

  const ReplaceStateWithPropsVisitor = {
    MemberExpression(path) {
      if (t.isThisExpression(path.node.object.object) && path.node.object.property.name === "state") {
        const stateVariable = path.node.property.name

        if (!stateProperties.has(stateVariable)) {
          stateProperties.set(stateVariable, void 0)
        }
        path.replaceWith(t.identifier(stateVariable))
      }
    },
  }

  const RemoveSetStateAndForceUpdateVisitor = {
    CallExpression(path) {
      if (t.isMemberExpression(path.node.callee)) {
        if (t.isThisExpression(path.node.callee.object)) {
          if (path.node.callee.property.name === "forceUpdate") {
            path.remove()
          } else if (path.node.callee.property.name === "setState") {
            const buildRequire = template(`
              STATE_SETTER(STATE_VALUE);
            `)

            path.node.arguments[0].properties.forEach(({ key, value }) => {
              path.insertBefore(buildRequire({
                STATE_SETTER: t.identifier(`set${capitalizeFirstLetter(key.name)}`),
                STATE_VALUE: value,
              }))

              stateProperties.set(key.name, value)
            })

            path.remove()
          }
        }
      }
    },
  }

  let stateHooksPresent = false

  let effectBody; let
    effectTeardown

  const lifecycleMethods = [
    "constructor",
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

  const arrowFunction = ({ name, params = [], propType = null, paramDefaults = [], body = [] }) => {
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

  const copyNonLifeCycleMethods = (path) => {
    const methodName = path.node.key.name
    const classBody = t.isClassMethod(path) ? path.node.body.body : path.node.value.body.body

    if (!lifecycleMethods.includes(methodName)) {
      path.traverse(RemoveSetStateAndForceUpdateVisitor)
      path.traverse(ReplaceStateWithPropsVisitor)
      path.traverse(RemoveThisVisitor)
      appendFunctionBodyToStatelessComponent(methodName, classBody)
    } else if (methodName === "componentDidMount") {
      path.traverse(RemoveSetStateAndForceUpdateVisitor)
      path.traverse(ReplaceStateWithPropsVisitor)
      path.traverse(RemoveThisVisitor)

      effectBody = path.node.body
    } else if (methodName === "componentWillUnmount") {
      path.traverse(RemoveSetStateAndForceUpdateVisitor)
      path.traverse(ReplaceStateWithPropsVisitor)
      path.traverse(RemoveThisVisitor)

      effectTeardown = path.node.body
    }
  }


  const appendFunctionBodyToStatelessComponent = (name, body) => {
    if (name !== "render") {
      functionBody.push(arrowFunction({ name, body }))
    } else {
      functionBody.push(...body)
    }
  }


  const visitor = {
    ClassDeclaration(path) {
      const statelessComponentName = path.node.id.name
      const defaultPropsPath = path.get("body").get("body").find((property) => t.isClassProperty(property) && property.node.key.name === "defaultProps")

      const statelessComponent = arrowFunction({
        name: (statelessComponentName),
        params: ["props"],
        propType: path.node.superTypeParameters && path.node.superTypeParameters.params.length ? path.node.superTypeParameters.params : null,
        paramDefaults: defaultPropsPath ? [defaultPropsPath.node.value] : [],
        body: functionBody,
      })

      const isExportDefaultDeclaration = t.isExportDefaultDeclaration(path.container)
      const isExportNamedDeclaration = t.isExportNamedDeclaration(path.container)

      const exportDefaultStatelessComponent = t.exportDefaultDeclaration(t.identifier(statelessComponentName))
      const exportNamedStatelessComponent = t.exportNamedDeclaration(statelessComponent, [])

      const mainPath = t.isExportDeclaration(path.container) ? path.findParent((p) => t.isExportDeclaration(p)) : path

      if (isExportDefaultDeclaration) {
        mainPath.insertBefore(statelessComponent)
        mainPath.insertBefore(exportDefaultStatelessComponent)
      } else if (isExportNamedDeclaration) {
        mainPath.insertBefore(exportNamedStatelessComponent)
      } else {
        mainPath.insertBefore(statelessComponent)
      }
    },
    ClassMethod(path) {
      if (isHooksForFunctionalComponentsExperimentOn()) {
        if (path.node.kind === "constructor") {
          const { expression = null } = path.node.body.body.find(((bodyStatement) => t.isAssignmentExpression(bodyStatement.expression))) || {}

          if (expression && expression.left.property.name === "state") {
            stateHooksPresent = true
            expression.right.properties.map(({ key, value }) => {
              stateProperties.set(key.name, value)
            })
          }
        }
      }

      copyNonLifeCycleMethods(path)
    },
    ClassProperty(path) {
      const propValue = path.node.value

      if (t.isFunctionExpression(propValue) || t.isArrowFunctionExpression(propValue)) {
        copyNonLifeCycleMethods(path)
      }
    },

    ImportDeclaration(path) {
      if (path.node.source.value === "react") {

      }
    },
  }


  const ast = codeToAst(component)
  const hasComponentDidUpdate = (node) => {
    const classDeclaration = isExportedDeclaration(node) ? node.declaration : ast.program.body[0]

    return Boolean((classDeclaration).body.body.find((node) => t.isClassMethod(node) && (node.key).name === "componentDidUpdate"))
  }

  traverse(ast, visitor)


  if (isHooksForFunctionalComponentsExperimentOn()) {
    if ((effectBody || effectTeardown)) {
      const expressions = []

      if (effectBody) {
        expressions.push(...effectBody.body)
      }

      if (effectTeardown) {
        expressions.push(t.returnStatement(t.arrowFunctionExpression([], effectTeardown)))
      }

      const lifecycleEffectHook = buildEffectHook({ EFFECT: expressions })
      // if(!(hasComponentDidUpdate(ast.program.body[0]))){
      //   lifecycleEffectHook.expression.arguments.push(t.arrayExpression([]));
      // }

      lifecycleEffectHook.expression.arguments.push(t.arrayExpression([]))

      functionBody.unshift(lifecycleEffectHook)
    }

    const hookExpressions = Array.from(stateProperties).map(([key, defaultValue]) => buildStateHook({
      STATE_PROP: t.identifier(key),
      STATE_SETTER: t.identifier(`set${capitalizeFirstLetter(key)}`),
      STATE_VALUE: defaultValue,
    }))

    functionBody.unshift(...hookExpressions)
  }

  ast.program.body.splice(-1)

  const processedJSX = transformFromAst(ast).code

  return {
    text: processedJSX,
    metadata: {
      stateHooksPresent,
    },
  }
}

export async function statefulToStatelessComponent() {
  const selectionProccessingResult = statefulToStateless(selectedText())
  const persistantChanges = [replaceSelectionWith(selectionProccessingResult.text)]

  if (selectionProccessingResult.metadata.stateHooksPresent) {
    persistantChanges.push(importStateHook())
  }
  await persistFileSystemChanges(...persistantChanges)
}

function importStateHook() {
  const currentFile = activeURI().path
  const file = readFileContent(currentFile)
  const ast = codeToAst(file)
  const reactImport = getReactImportReference(ast)

  reactImport.specifiers.push(t.importSpecifier(t.identifier("useState"), t.identifier("useState")))
  const updatedReactImport = transformFromAst(t.program([reactImport])).code

  return replaceTextInFile(updatedReactImport, new Position(reactImport.loc.start.line, reactImport.loc.start.column), new Position(reactImport.loc.end.line, reactImport.loc.end.column), activeFileName())
}

export function isStatefulComp(code) {
  const ast = templateToAst(code)

  const isSupportedComponent = (classPath) => {
    const supportedComponents = ["Component", "PureComponent"]

    if (!classPath) {
      return false
    }

    return (classPath.superClass && (
      (classPath.superClass.object
        && classPath.superClass.object.name === "React"
        && supportedComponents.indexOf(classPath.superClass.property.name)
          !== -1)
      || supportedComponents.indexOf(classPath.superClass.name) !== -1
    ))
  }

  return (
    (isExportedDeclaration(ast) && isSupportedComponent(ast.declaration))
    || isSupportedComponent(ast)
  )
}
