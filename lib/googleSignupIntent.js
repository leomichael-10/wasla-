// Carries "this Google sign-up is for a seller" across the OAuth
// round-trip (our page -> accounts.google.com -> back to our callback).
// NextAuth's signIn callback has no direct access to the client's
// intended callbackUrl/state at account-creation time, but it runs
// inside the same request as the callback route, so a short-lived,
// ordinary (non-httpOnly) cookie set right before redirecting to Google
// is the simplest thing that survives the round-trip and is readable
// there via next/headers' cookies(). Not a security boundary — anyone
// can already choose to sign up as a seller through the public chooser,
// and lib/authOptions.js only ever consults this on first-time account
// creation, never to change an existing account's role.
export const SIGNUP_INTENT_COOKIE = 'wasla_signup_intent'

/** Set (or clear) the seller sign-up intent right before calling next-auth's signIn('google'). */
export function setGoogleSignupIntent(wantsSeller) {
  if (typeof document === 'undefined') return
  document.cookie = wantsSeller
    ? `${SIGNUP_INTENT_COOKIE}=seller; path=/; max-age=600`
    : `${SIGNUP_INTENT_COOKIE}=; path=/; max-age=0`
}
