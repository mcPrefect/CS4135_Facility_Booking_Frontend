import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  nlpQuery,
  searchFacilities,
} from '../services/api'
import { decodeJwtPayload, getStoredToken, setStoredToken } from '../utils/jwt'

export default function DashboardPage() {
  const navigate = useNavigate()
  const token = getStoredToken()
  const claims = useMemo(() => decodeJwtPayload(token), [token])
  const userId = claims?.userId || null
  const email = claims?.sub || ''
  const role = claims?.role || ''

  const [facilities, setFacilities] = useState([])
  const [facilityFilter, setFacilityFilter] = useState({ type: '', building: '' })
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(null)
  const [nlpText, setNlpText] = useState('Book the sports hall tomorrow at 2pm')
  const [nlpResult, setNlpResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadFacilities = useCallback(async () => {
    const data = await searchFacilities({
      type: facilityFilter.type || undefined,
      building: facilityFilter.building || undefined,
    })
    setFacilities(data?.content || [])
  }, [facilityFilter.type, facilityFilter.building])

  const loadNotifications = useCallback(async () => {
    if (!userId) return
    const [list, countRes] = await Promise.all([
      fetchNotifications(userId),
      fetchUnreadCount(userId),
    ])
    setNotifications(Array.isArray(list) ? list : [])
    const c = countRes?.unreadCount ?? countRes?.count
    setUnread(typeof c === 'number' ? c : null)
  }, [userId])

  useEffect(() => {
    if (!token || !userId) {
      navigate('/login', { replace: true })
      return
    }
    setError('')
    ;(async () => {
      try {
        await loadFacilities()
      } catch (e) {
        setError(e.message || 'Failed to load facilities')
      }
    })()
  }, [token, userId, navigate, loadFacilities])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        await loadNotifications()
      } catch {
        /* notifications optional if service down */
      }
    })()
  }, [userId, loadNotifications])

  function logout() {
    setStoredToken(null)
    navigate('/login', { replace: true })
  }

  async function refreshFacilities(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await loadFacilities()
    } catch (err) {
      setError(err.message || 'Search failed')
    } finally {
      setBusy(false)
    }
  }

  async function onMarkRead(id) {
    setError('')
    try {
      await markNotificationRead(id)
      await loadNotifications()
    } catch (err) {
      setError(err.message || 'Could not mark read')
    }
  }

  async function onNlp(e) {
    e.preventDefault()
    setError('')
    setNlpResult(null)
    setBusy(true)
    try {
      const res = await nlpQuery(nlpText)
      setNlpResult(res)
    } catch (err) {
      setError(err.message || 'NLP request failed')
    } finally {
      setBusy(false)
    }
  }

  if (!userId) return null

  return (
    <div className="dashboard">
      <header className="top-bar">
        <div>
          <h1>Plassey Planner</h1>
          <p className="muted">
            {email} · {role}
            {unread !== null ? ` · unread notifications: ${unread}` : ''}
          </p>
        </div>
        <button type="button" className="secondary" onClick={logout}>
          Log out
        </button>
      </header>

      {error ? <p className="error banner">{error}</p> : null}

      <section className="panel">
        <h2>Facilities</h2>
        <form className="inline-form" onSubmit={refreshFacilities}>
          <input
            placeholder="Type filter (e.g. LECTURE_HALL)"
            value={facilityFilter.type}
            onChange={(e) => setFacilityFilter((f) => ({ ...f, type: e.target.value }))}
          />
          <input
            placeholder="Building"
            value={facilityFilter.building}
            onChange={(e) => setFacilityFilter((f) => ({ ...f, building: e.target.value }))}
          />
          <button type="submit" disabled={busy}>
            Search
          </button>
        </form>
        <ul className="facility-list">
          {facilities.map((f) => (
            <li key={f.id}>
              <strong>{f.name}</strong> — {f.type} · cap {f.capacity}
              {f.location ? (
                <span className="muted">
                  {' '}
                  · {f.location.building} / {f.location.room}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {facilities.length === 0 ? <p className="muted">No facilities match.</p> : null}
      </section>

      <section className="panel">
        <h2>Notifications</h2>
        <p className="muted">Loaded via GET /api/v1/notifications/{'{userId}'}</p>
        <ul className="notification-list">
          {notifications.map((n) => (
            <li key={n.notificationId}>
              <div>
                <span className={`pill ${n.isRead ? 'read' : 'unread'}`}>
                  {n.isRead ? 'read' : 'new'}
                </span>{' '}
                {n.message}
              </div>
              {!n.isRead ? (
                <button type="button" className="small" onClick={() => onMarkRead(n.notificationId)}>
                  Mark read
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {notifications.length === 0 ? <p className="muted">No notifications yet.</p> : null}
      </section>

      <section className="panel">
        <h2>Natural language (NLP)</h2>
        <p className="muted">POST /api/nlp/query through the gateway (Bearer required).</p>
        <form onSubmit={onNlp}>
          <textarea
            rows={3}
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            style={{ width: '100%' }}
          />
          <button type="submit" disabled={busy}>
            Interpret
          </button>
        </form>
        {nlpResult ? (
          <pre className="code-block">{JSON.stringify(nlpResult, null, 2)}</pre>
        ) : null}
      </section>
    </div>
  )
}
