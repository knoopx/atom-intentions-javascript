"use babel"

export default function renameVariable(identifierPath, newName) {
  identifierPath.scope.rename(identifierPath.node.name, newName)
}
