"use babel"

export default function renameIdentifier(identifierPath, newName) {
  identifierPath.scope.rename(identifierPath.node.name, newName)
}
