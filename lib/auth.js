/**
 * Reads the user injected by middleware from request headers.
 * Returns null when the request came through an unauthenticated path.
 */

console.log('GOOGLE SECRET LAST 4:', process.env.GOOGLE_CLIENT_SECRET?.slice(-4))
export function getUser(request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return null
  return {
    userId: parseInt(userId, 10),
    email:  request.headers.get('x-user-email'),
    role:   request.headers.get('x-user-role'),
  }
}
