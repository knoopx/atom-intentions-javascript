"use babel"

import { TextEditor, CompositeDisposable, Disposable } from "atom"

class TextInputView {
  constructor(title, onConfirm, onCancel) {
    this.disposables = new CompositeDisposable()

    this.element = document.createElement("div")
    this.miniEditor = new TextEditor({ mini: true })
    this.element.appendChild(this.miniEditor.element)

    this.message = document.createElement("div")
    this.message.classList.add("message")
    this.element.appendChild(this.message)
    this.message.textContent = title

    this.disposables.add(
      atom.commands.add(this.element, {
        "core:confirm": (e) => {
          onConfirm(this.miniEditor.getText())
          this.close()
        },
        "core:cancel": (e) => {
          this.close()
          onCancel("cancelled")
        },
      }),
    )

    const blurHandler = () => {
      this.close()
    }

    this.miniEditor.element.addEventListener("blur", blurHandler)
    this.disposables.add(
      new Disposable(() =>
        this.miniEditor.element.removeEventListener("blur", blurHandler),
      ),
    )
  }

  attach(text = "", selection) {
    if (this.panel == null)
      this.panel = atom.workspace.addModalPanel({ item: this, visible: false })
    this.previouslyFocusedElement = document.activeElement
    this.panel.show()
    this.miniEditor.setText(text)

    if (selection) {
      const [start, end] = selection
      this.miniEditor.setSelectedBufferRange([[0, start], [0, end]])
    } else {
      this.miniEditor.selectAll()
    }

    this.miniEditor.element.focus()
  }

  close() {
    if (!this.panel.isVisible()) return
    this.panel.hide()
    if (this.previouslyFocusedElement != null)
      this.previouslyFocusedElement.focus()
    this.destroy()
  }

  destroy() {
    if (this.panel != null) this.panel.destroy()
    this.disposables.dispose()
  }
}

export function prompt(title, defaultFilename = "", selection) {
  return new Promise((resolve, reject) => {
    const view = new TextInputView(title, resolve, reject)
    // something is stealing focus...
    setTimeout(() => {
      view.attach(defaultFilename, selection)
    })
  })
}
