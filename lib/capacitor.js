// No @capacitor/* package is installed in this repo yet — Capacitor
// hasn't been added as a build dependency, only prepared for. This checks
// for the global `window.Capacitor` object the native Capacitor runtime
// injects into the WebView at startup, which needs no package import and
// is simply absent (so this returns false) in a normal browser today. Once
// Capacitor is actually wrapped around the app, this starts returning true
// inside it with no code change here.
export function isNativeApp() {
  if (typeof window === 'undefined') return false
  return Boolean(window.Capacitor?.isNativePlatform?.())
}
