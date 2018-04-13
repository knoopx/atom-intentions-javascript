'use babel'

import { parse } from './refactoring'
import INTENTIONS from './intentions'

export default {
  activate: function() {
    require('atom-package-deps').install()
  },
  provideIntentions: function() {
    return {
      grammarScopes: ['source.js', 'source.js.jsx'],
      getIntentions: function(props) {
        const { textEditor, bufferPosition } = props
        const ast = parse(textEditor.getBuffer().getText())
        return INTENTIONS.filter((intention) =>
          intention.runnable({ ...props, ast }),
        ).map((intention) => ({
          ...intention,
          selected: () => {
            intention.selected({ ...props, ast })
          },
        }))
      },
    }
  },
  highlightIntentions: function() {
    return {
      grammarScopes: ['*'],
      getIntentions({ textEditor, visibleRange }) {
        return []
      },
    }
  },
}
