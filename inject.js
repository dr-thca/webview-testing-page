(() => {
  const send = (payload) => {
    const message =
      typeof payload === 'string' ? payload : JSON.stringify(payload)

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(message)
    } else {
      window.postMessage(message, '*')
    }
  }

  const touchTargets = () => {
    const alpha = document.querySelector('#target-alpha')
    const beta = document.querySelector('#target-beta')
    const gamma = document.querySelector('#target-gamma')

    if (alpha) {
      alpha.textContent = `Alpha updated at ${new Date().toLocaleTimeString()}`
    }

    if (beta) {
      beta.textContent = 'Beta has been injected with new text.'
    }

    if (gamma) {
      gamma.style.background = '#d9f2ff'
      gamma.style.color = '#0f3042'
    }
  }

  send({
    type: 'inject:init',
    url: window.location.href,
    timestamp: new Date().toISOString(),
  })

  if (window.__setStatus) {
    window.__setStatus('Injected script ran')
  }

  if (window.__appendLog) {
    window.__appendLog('Injected script ran')
  }

  touchTargets()

  setTimeout(() => {
    send({ type: 'inject:ping', message: 'Hello from injected JS' })
  }, 500)
})()
