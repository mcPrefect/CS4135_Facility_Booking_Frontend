import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { decodeJwtPayload, setStoredToken } from '../utils/jwt'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const data = await login(email, password)
      if (data?.token) {
        setStoredToken(data.token)
        const uid =
          data.userId || decodeJwtPayload(data.token)?.userId
        if (uid) localStorage.setItem('userId', String(uid))
        navigate('/', { replace: true })
      } else {
        setError(data?.message || 'Login failed')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      <p className="muted">Plassey Planner — all calls go through the API gateway.</p>
      {error ? <p className="error">{error}</p> : null}
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <p className="muted">
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}
