"use babel"

import { parse } from "esquery"

const LEFT_SIDE = {}
const RIGHT_SIDE = {}

/**
 * Get the value of a property which may be multiple levels down in the object.
 */
function getPath(obj, key) {
  let i
  const keys = key.split(".")
  for (i = 0; i < keys.length; i++) {
    if (obj == null) {
      return obj
    }
    obj = obj[keys[i]]
  }
  return obj
}

/**
 * Determine whether `node` can be reached by following `path`, starting at `ancestor`.
 */
function inPath(node, ancestor, path) {
  let field
  let remainingPath
  let i
  if (path.length === 0) {
    return node === ancestor
  }
  if (ancestor == null) {
    return false
  }
  field = ancestor[path[0]]
  remainingPath = path.slice(1)
  if (isArray(field)) {
    for (i = 0, l = field.length; i < l; ++i) {
      if (inPath(node, field[i], remainingPath)) {
        return true
      }
    }
    return false
  }
  return inPath(node, field, remainingPath)
}

/**
 * Given a `node` and its ancestors, determine if `node` is matched by `selector`.
 */
export function matches(node, selector, ancestry) {
  let path
  let ancestor
  let i
  let l
  let p
  if (!selector) {
    return true
  }
  if (!node) {
    return false
  }
  if (!ancestry) {
    ancestry = []
  }

  switch (selector.type) {
    case "wildcard":
      return true

    case "identifier":
      return selector.value.toLowerCase() === node.type.toLowerCase()

    case "field":
      path = selector.name.split(".")
      ancestor = ancestry[path.length - 1]
      return inPath(node, ancestor, path)

    case "matches":
      for (i = 0, l = selector.selectors.length; i < l; ++i) {
        if (matches(node, selector.selectors[i], ancestry)) {
          return true
        }
      }
      return false

    case "compound":
      for (i = 0, l = selector.selectors.length; i < l; ++i) {
        if (!matches(node, selector.selectors[i], ancestry)) {
          return false
        }
      }
      return true

    case "not":
      for (i = 0, l = selector.selectors.length; i < l; ++i) {
        if (matches(node, selector.selectors[i], ancestry)) {
          return false
        }
      }
      return true

    case "has":
      var a
      var collector = []
      for (i = 0, l = selector.selectors.length; i < l; ++i) {
        a = []
        estraverse.traverse(node, {
          enter(node, parent) {
            if (parent != null) {
              a.unshift(parent)
            }
            if (matches(node, selector.selectors[i], a)) {
              collector.push(node)
            }
          },
          leave() {
            a.shift()
          },
        })
      }
      return collector.length !== 0

    case "child":
      if (matches(node, selector.right, ancestry)) {
        return matches(ancestry[0], selector.left, ancestry.slice(1))
      }
      return false

    case "descendant":
      if (matches(node, selector.right, ancestry)) {
        for (i = 0, l = ancestry.length; i < l; ++i) {
          if (matches(ancestry[i], selector.left, ancestry.slice(i + 1))) {
            return true
          }
        }
      }
      return false

    case "attribute":
      p = getPath(node, selector.name)
      switch (selector.operator) {
        case null:
        case void 0:
          return p != null
        case "=":
          switch (selector.value.type) {
            case "regexp":
              return typeof p === "string" && selector.value.value.test(p)
            case "literal":
              return `${selector.value.value}` === `${p}`
            case "type":
              return selector.value.value === typeof p
          }
        case "!=":
          switch (selector.value.type) {
            case "regexp":
              return !selector.value.value.test(p)
            case "literal":
              return `${selector.value.value}` !== `${p}`
            case "type":
              return selector.value.value !== typeof p
          }
        case "<=":
          return p <= selector.value.value
        case "<":
          return p < selector.value.value
        case ">":
          return p > selector.value.value
        case ">=":
          return p >= selector.value.value
      }

    case "sibling":
      return (
        (matches(node, selector.right, ancestry) &&
          sibling(node, selector.left, ancestry, LEFT_SIDE)) ||
        (selector.left.subject &&
          matches(node, selector.left, ancestry) &&
          sibling(node, selector.right, ancestry, RIGHT_SIDE))
      )

    case "adjacent":
      return (
        (matches(node, selector.right, ancestry) &&
          adjacent(node, selector.left, ancestry, LEFT_SIDE)) ||
        (selector.right.subject &&
          matches(node, selector.left, ancestry) &&
          adjacent(node, selector.right, ancestry, RIGHT_SIDE))
      )

    case "nth-child":
      return (
        matches(node, selector.right, ancestry) &&
        nthChild(node, ancestry, function(length) {
          return selector.index.value - 1
        })
      )

    case "nth-last-child":
      return (
        matches(node, selector.right, ancestry) &&
        nthChild(node, ancestry, function(length) {
          return length - selector.index.value
        })
      )

    case "class":
      if (!node.type) return false
      switch (selector.name.toLowerCase()) {
        case "statement":
          if (node.type.slice(-9) === "Statement") return true
        // fallthrough: interface Declaration <: Statement { }
        case "declaration":
          return node.type.slice(-11) === "Declaration"
        case "pattern":
          if (node.type.slice(-7) === "Pattern") return true
        // fallthrough: interface Expression <: Node, Pattern { }
        case "expression":
          return (
            node.type.slice(-10) === "Expression" ||
            node.type.slice(-7) === "Literal" ||
            (node.type === "Identifier" &&
              (ancestry.length === 0 || ancestry[0].type !== "MetaProperty")) ||
            node.type === "MetaProperty"
          )
        case "function":
          return (
            node.type.slice(0, 8) === "Function" ||
            node.type === "ArrowFunctionExpression"
          )
      }
      throw new Error(`Unknown class name: ${selector.name}`)
  }

  throw new Error(`Unknown selector type: ${selector.type}`)
}

/*
 * Determines if the given node has a sibling that matches the given selector.
 */
function sibling(node, selector, ancestry, side) {
  const parent = ancestry[0]
  let listProp
  let startIndex
  let keys
  let i
  let l
  let k
  let lowerBound
  let upperBound
  if (!parent) {
    return false
  }
  keys = estraverse.VisitorKeys[parent.type]
  for (i = 0, l = keys.length; i < l; ++i) {
    listProp = parent[keys[i]]
    if (isArray(listProp)) {
      startIndex = listProp.indexOf(node)
      if (startIndex < 0) {
        continue
      }
      if (side === LEFT_SIDE) {
        lowerBound = 0
        upperBound = startIndex
      } else {
        lowerBound = startIndex + 1
        upperBound = listProp.length
      }
      for (k = lowerBound; k < upperBound; ++k) {
        if (matches(listProp[k], selector, ancestry)) {
          return true
        }
      }
    }
  }
  return false
}

/*
 * Determines if the given node has an asjacent sibling that matches the given selector.
 */
function adjacent(node, selector, ancestry, side) {
  const parent = ancestry[0]
  let listProp
  let keys
  let i
  let l
  let idx
  if (!parent) {
    return false
  }
  keys = estraverse.VisitorKeys[parent.type]
  for (i = 0, l = keys.length; i < l; ++i) {
    listProp = parent[keys[i]]
    if (isArray(listProp)) {
      idx = listProp.indexOf(node)
      if (idx < 0) {
        continue
      }
      if (
        side === LEFT_SIDE &&
        idx > 0 &&
        matches(listProp[idx - 1], selector, ancestry)
      ) {
        return true
      }
      if (
        side === RIGHT_SIDE &&
        idx < listProp.length - 1 &&
        matches(listProp[idx + 1], selector, ancestry)
      ) {
        return true
      }
    }
  }
  return false
}

/*
 * Determines if the given node is the nth child, determined by idxFn, which is given the containing list's length.
 */
function nthChild(node, ancestry, idxFn) {
  const parent = ancestry[0]
  let listProp
  let keys
  let i
  let l
  let idx
  if (!parent) {
    return false
  }
  keys = estraverse.VisitorKeys[parent.type]
  for (i = 0, l = keys.length; i < l; ++i) {
    listProp = parent[keys[i]]
    if (isArray(listProp)) {
      idx = listProp.indexOf(node)
      if (idx >= 0 && idx === idxFn(listProp.length)) {
        return true
      }
    }
  }
  return false
}

/*
 * For each selector node marked as a subject, find the portion of the selector that the subject must match.
 */
function subjects(selector, ancestor) {
  let results
  let p
  if (selector == null || typeof selector !== "object") {
    return []
  }
  if (ancestor == null) {
    ancestor = selector
  }
  results = selector.subject ? [ancestor] : []
  for (p in selector) {
    if (!{}.hasOwnProperty.call(selector, p)) {
      continue
    }
    ;[].push.apply(
      results,
      subjects(selector[p], p === "left" ? selector[p] : ancestor),
    )
  }
  return results
}

/**
 * From a JS AST and a selector AST, collect all JS AST nodes that match the selector.
 */
export function match(path, selector) {
  const ancestry = []
  const results = []
  let i
  let l
  let k
  let m
  if (!selector) {
    return results
  }
  const altSubjects = subjects(selector)
  path.traverse({
    enter(p) {
      const { node, parentPath } = p

      if (parentPath != null) {
        ancestry.unshift(parentPath)
      }

      if (matches(node, selector, ancestry)) {
        if (altSubjects.length) {
          for (i = 0, l = altSubjects.length; i < l; ++i) {
            if (matches(node, altSubjects[i], ancestry)) {
              results.push(p)
            }
            for (k = 0, m = ancestry.length; k < m; ++k) {
              if (matches(ancestry[k], altSubjects[i], ancestry.slice(k + 1))) {
                results.push(ancestry[k])
              }
            }
          }
        } else {
          results.push(p)
        }
      }
    },
    exit() {
      ancestry.shift()
    },
  })
  return results
}

/**
 * Query the code AST using the selector string.
 */
export function query(ast, selector) {
  return match(ast, parse(selector))
}
