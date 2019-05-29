"use babel"

export default function renameFunction(identifierPath, newName) {
  identifierPath.scope.parent.rename(identifierPath.node.id.name, newName)
}
