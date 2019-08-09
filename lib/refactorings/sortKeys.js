"use babel"

export default function sortKeys(objectExpressionPath) {
  const isSpreadElement = (prop) => prop && prop.type === "SpreadElement"
  const isValue = (prop) => prop && prop.type !== "SpreadElement"
  const getPropName = (prop) => (prop.key && (prop.key.name || prop.key.value)) || ""
  const sortByPropName = (a, b) => {
    if (a < b) return -1
    if (a > b) return 1

    return 0
  }
  const sortProps = (props) => {
    props.sort((a, b) => sortByPropName(getPropName(a), getPropName(b)))
  }

  const objectExpression = objectExpressionPath.node
  const chunks = []
  const nextProperties = []

  objectExpression.properties.forEach((prop, i, props) => {
    if (isValue(prop)) {
      const prev = props[i - 1]
      const next = props[i + 1]
      const isChunkStart = !isValue(prev)
      const isChunkEnd = !isValue(next)

      if (isChunkStart) { chunks.push([]) }

      const [chunk] = chunks.slice(-1)

      chunk.push(prop)

      if (isChunkEnd) {
        sortProps(chunk)
        nextProperties.push(...chunk)
      }
    } else if (isSpreadElement(prop)) {
      nextProperties.push(prop)
    }
  })

  objectExpression.properties = nextProperties
}
