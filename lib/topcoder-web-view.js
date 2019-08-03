'use babel'

import workflow from './topcoder-workflow'

module.exports = class TopcoderWebView {
  // constructor
  constructor (serializedState) {
    this.element = document.createElement('div')
    this.element.setAttribute('id', 'topcoder-workflow')
    this.element.innerHTML = serializedState.html
    this.title = serializedState.title
    this.element.addEventListener('click', (event) => {
      if (event.path[0].href && event.path[0].href.startsWith(workflow.uriPattern)) {
        const challengeId = event.path[0].href.substring(workflow.uriPattern.length + 1)
        workflow.viewChallenge(challengeId)
      }
      // when the click is on challenge detail -> register button
      if (event.target.id === 'registerButton') {
        const challengeId = event.target.getAttribute('data-id')
        workflow.registerUserForChallenge(challengeId, event.target)
      }
    })
  }

  // returns an object that can be retrieved when package is activated
  serialize () { }

  // get title
  getTitle () {
    return this.title || 'Topcoder: Open challenges'
  }

  // reload the web view with passing html
  reload (html) {
    this.element.innerHTML = html
  }

  // destroy the web view
  destroy () {
    this.element.remove()
  }

  // getter for web view document element
  getElement () {
    return this.element
  }
}
