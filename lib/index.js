"use babel"

import { parse } from "./refactorings"
import INTENTIONS from "./intentions"

export default {
  activate() {
    // require("atom-package-deps").install()
  },
  provideIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        const { textEditor } = props
        const ast = parse(textEditor.getBuffer().getText())

        return INTENTIONS.filter((intention) =>
          intention.runnable({ ...props, ast })).map((intention) => ({
          ...intention,
          selected: () => {
            intention.selected({ ...props, ast })
          },
        }))
      },
    }
  },
  highlightIntentions() {
    return {
      grammarScopes: ["source.js", "source.js.jsx"],
      getIntentions(props) {
        return []
      },
    }
  },
}
