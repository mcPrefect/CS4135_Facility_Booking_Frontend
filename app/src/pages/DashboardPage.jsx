import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  approveBooking,
  cancelBooking,
  createBooking,
  fetchMyBookings,
  fetchNotifications,
  fetchPendingApprovals,
  fetchUnreadCount,
  markNotificationRead,
  nlpQuery,
  rejectBooking,
  searchFacilities,
} from '../services/api'
import { decodeJwtPayload, getStoredToken, getUserIdFromSession, setStoredToken } from '../utils/jwt'

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultBookingSlot() {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(14, 0, 0, 0)
  const end = new Date(start)
  end.setHours(15, 0, 0, 0)
  return { start: toDatetimeLocalValue(start), end: toDatetimeLocalValue(end) }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const token = getStoredToken()
  const claims = useMemo(() => decodeJwtPayload(token), [token])
  const userId = getUserIdFromSession(token)
  const email = claims?.sub || ''
  const role = claims?.role || ''
  const isAdmin = role === 'ADMIN'

  const defaultSlot = useMemo(() => defaultBookingSlot(), [])
  const [bookFacilityId, setBookFacilityId] = useState('')
  const [bookStart, setBookStart] = useState(defaultSlot.start)
  const [bookEnd, setBookEnd] = useState(defaultSlot.end)
  const [bookPurpose, setBookPurpose] = useState('Group study')
  const [myBookings, setMyBookings] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])

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

  const loadBookings = useCallback(async () => {
    const list = await fetchMyBookings()
    setMyBookings(Array.isArray(list) ? list : [])
  }, [])

  const loadPendingApprovals = useCallback(async () => {
    if (!isAdmin) return
    const list = await fetchPendingApprovals()
    setPendingApprovals(Array.isArray(list) ? list : [])
  }, [isAdmin])

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

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        await loadBookings()
      } catch {
        /* booking service optional if stack not fully up */
      }
    })()
  }, [userId, loadBookings])

  useEffect(() => {
    if (!userId || !isAdmin) return
    ;(async () => {
      try {
        await loadPendingApprovals()
      } catch {
        /* approval service optional */
      }
    })()
  }, [userId, isAdmin, loadPendingApprovals])

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

  async function onCreateBooking(e) {
    e.preventDefault()
    if (!bookFacilityId) {
      setError('Select a facility to book')
      return
    }
    setError('')
    setBusy(true)
    try {
      await createBooking({
        facilityId: bookFacilityId,
        startTime: new Date(bookStart).toISOString(),
        endTime: new Date(bookEnd).toISOString(),
        purpose: bookPurpose,
      })
      await loadBookings()
      if (isAdmin) await loadPendingApprovals()
      setError('')
      setBookPurpose('Group study')
    } catch (err) {
      const msg = err.message || 'Booking failed'
      setError(msg.includes('409') || msg.toLowerCase().includes('conflict') ? 'Time slot conflict — pick another time' : msg)
    } finally {
      setBusy(false)
    }
  }

  async function onCancelBooking(bookingId) {
    setError('')
    setBusy(true)
    try {
      await cancelBooking(bookingId)
      await loadBookings()
    } catch (err) {
      setError(err.message || 'Could not cancel booking')
    } finally {
      setBusy(false)
    }
  }

  async function onApprove(bookingId) {
    setError('')
    setBusy(true)
    try {
      await approveBooking(bookingId)
      await loadPendingApprovals()
      await loadBookings()
      await loadNotifications()
    } catch (err) {
      setError(err.message || 'Approve failed')
    } finally {
      setBusy(false)
    }
  }

  async function onReject(bookingId) {
    setError('')
    setBusy(true)
    try {
      await rejectBooking(bookingId, 'Not available')
      await loadPendingApprovals()
      await loadBookings()
    } catch (err) {
      setError(err.message || 'Reject failed')
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
        <h2>Create booking</h2>
        <p className="muted">POST /api/v1/bookings via gateway</p>
        <form className="book-form" onSubmit={onCreateBooking}>
          <label>
            Facility
            <select
              value={bookFacilityId}
              onChange={(e) => setBookFacilityId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.type})
                </option>
              ))}
            </select>
          </label>
          <label>
            Start
            <input
              type="datetime-local"
              value={bookStart}
              onChange={(e) => setBookStart(e.target.value)}
              required
            />
          </label>
          <label>
            End
            <input
              type="datetime-local"
              value={bookEnd}
              onChange={(e) => setBookEnd(e.target.value)}
              required
            />
          </label>
          <label>
            Purpose
            <input value={bookPurpose} onChange={(e) => setBookPurpose(e.target.value)} />
          </label>
          <button type="submit" disabled={busy || facilities.length === 0}>
            Book
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>My bookings</h2>
        <ul className="booking-list">
          {myBookings.map((b) => (
            <li key={b.bookingId}>
              <div>
                <strong>{b.facilityName || b.facilityId}</strong> — {b.status}
                <span className="muted block">
                  {b.startTime} → {b.endTime}
                </span>
              </div>
              {b.status === 'PENDING' || b.status === 'APPROVED' ? (
                <button type="button" className="small" onClick={() => onCancelBooking(b.bookingId)}>
                  Cancel
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {myBookings.length === 0 ? <p className="muted">No bookings yet.</p> : null}
      </section>

      {isAdmin ? (
        <section className="panel">
          <h2>Pending approvals (admin)</h2>
          <p className="muted">PATCH /api/v1/approvals/&#123;bookingId&#125;/approve|reject</p>
          <ul className="booking-list">
            {pendingApprovals.map((t) => (
              <li key={t.taskId}>
                <div>
                  <strong>{t.facilityName}</strong> — booking {t.bookingId}
                  <span className="muted block">
                    {t.bookingStart} → {t.bookingEnd}
                  </span>
                </div>
                <div className="btn-row">
                  <button type="button" className="small" onClick={() => onApprove(t.bookingId)}>
                    Approve
                  </button>
                  <button type="button" className="small danger" onClick={() => onReject(t.bookingId)}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {pendingApprovals.length === 0 ? <p className="muted">No pending approvals.</p> : null}
        </section>
      ) : null}

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
