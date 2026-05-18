const base = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function authHeaders(extra = {}) {
  const headers = { ...extra }
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function handle(res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.assign('/login')
    throw new Error('Session expired')
  }
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const msg = typeof data === 'object' && data && data.message ? data.message : res.statusText
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return data
}

export async function login(email, password) {
  const res = await fetch(`${base()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handle(res)
}

export async function register(email, password) {
  const res = await fetch(`${base()}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handle(res)
}

export async function searchFacilities(params = {}) {
  const q = new URLSearchParams()
  if (params.type) q.set('type', params.type)
  if (params.building) q.set('building', params.building)
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 20))
  const res = await fetch(`${base()}/api/v1/facilities?${q}`, {
    headers: authHeaders(),
  })
  return handle(res)
}

export async function fetchNotifications(userId) {
  const res = await fetch(`${base()}/api/v1/notifications/${userId}`, {
    headers: authHeaders(),
  })
  return handle(res)
}

export async function fetchUnreadCount(userId) {
  const res = await fetch(`${base()}/api/v1/notifications/${userId}/unread-count`, {
    headers: authHeaders(),
  })
  return handle(res)
}

export async function markNotificationRead(notificationId) {
  const res = await fetch(`${base()}/api/v1/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.assign('/login')
    throw new Error('Session expired')
  }
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return null
}

export async function nlpQuery(rawText) {
  const res = await fetch(`${base()}/api/nlp/query`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ rawText }),
  })
  return handle(res)
}

export async function createBooking({ facilityId, startTime, endTime, purpose }) {
  const res = await fetch(`${base()}/api/v1/bookings`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ facilityId, startTime, endTime, purpose: purpose || null }),
  })
  return handle(res)
}

export async function fetchMyBookings(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`${base()}/api/v1/bookings${q}`, {
    headers: authHeaders(),
  })
  return handle(res)
}

export async function cancelBooking(bookingId) {
  const res = await fetch(`${base()}/api/v1/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handle(res)
}

export async function fetchPendingApprovals() {
  const res = await fetch(`${base()}/api/v1/approvals/pending`, {
    headers: authHeaders(),
  })
  return handle(res)
}

export async function approveBooking(bookingId, reason) {
  const res = await fetch(`${base()}/api/v1/approvals/${bookingId}/approve`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reason ? { reason } : {}),
  })
  return handle(res)
}

export async function rejectBooking(bookingId, reason) {
  const res = await fetch(`${base()}/api/v1/approvals/${bookingId}/reject`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason: reason || 'Rejected by administrator' }),
  })
  return handle(res)
}
