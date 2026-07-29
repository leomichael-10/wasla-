// Shared beforeinstallprompt capture so both the PWAInstall banner and the
// mobile Account sheet's "Install app" entry can trigger the same prompt,
// instead of each attaching its own listener (only one can call
// preventDefault()+prompt() usefully per captured event).

let deferredPrompt = null
const listeners = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
    listeners.forEach(fn => fn(e))
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
  })
}

export function getDeferredPrompt() {
  return deferredPrompt
}

export function onPromptAvailable(fn) {
  listeners.add(fn)
  if (deferredPrompt) fn(deferredPrompt)
  return () => listeners.delete(fn)
}

export async function triggerInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  return choice.outcome === 'accepted'
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}
