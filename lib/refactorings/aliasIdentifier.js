"use babel"

export default function aliasIdentifier(identifierPath, newName) {
  identifierPath.scope.rename(identifierPath.node.name, newName)
}
