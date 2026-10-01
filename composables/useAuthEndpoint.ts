/**
 * Auth endpoint resolver — Nitro endpoints under `/api/auth/*` (sets the httpOnly cookie).
 */
export function authEndpoint(action: 'login' | 'register' | 'logout' | 'me'): string {
  return `/api/auth/${action}`
}
