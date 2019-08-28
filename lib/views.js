"use babel"

import { TextEditorView } from "atom-space-pen-views"

class TextInputView extends TextEditorView {
  constructor(title, onConfirm, onCancel, defaultValue = "") {
    super({
      mini: true,
      placeholderText: title,
    })
    this.setText(defaultValue)
    this.model.selectAll()
    this.onConfirm = onConfirm
    this.onCancel = onCancel
    this.modal = atom.workspace.addModalPanel({
      item: this,
      visible: false,
    })

    this.addClass("from-top save-panel")

    atom.commands.add(this.element, {
      "core:confirm": (e) => {
        this.onConfirm(this.getText())
        e.stopPropagation()
        this.modal.hide()
      },
      "core:cancel": (e) => {
        this.onCancel()
        e.stopPropagation()
        this.modal.hide()
      },
    })

    this.modal.show()
    this.focus()
  }
}

export function prompt(title, defaultFilename = "") {
  return new Promise((resolve, reject) => {
    new TextInputView(title, resolve, reject, defaultFilename)
  })
}
