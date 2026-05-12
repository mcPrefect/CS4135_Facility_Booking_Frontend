/**
 * Decode JWT payload (no signature verification — gateway/services validate).
 * @param {string} token
 * @returns {Record<string, unknown>|null}
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getStoredToken() {
  return localStorage.getItem('token')
}

export function setStoredToken(token) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}
