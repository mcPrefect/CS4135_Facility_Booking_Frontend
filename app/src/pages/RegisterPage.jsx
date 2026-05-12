import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    try {
      const data = await register(email, password)
      if (data?.userId) {
        setInfo(data.message || 'Account created. You can sign in.')
        setTimeout(() => navigate('/login', { replace: true }), 1200)
        return
      }
      setError(data?.message || 'Registration failed')
    } catch (err) {
      setError(err.message || 'Registration failed')
    }
  }

  return (
    <div className="auth-card">
      <h1>Create account</h1>
      <p className="muted">New accounts are created as students.</p>
      {error ? <p className="error">{error}</p> : null}
      {info ? <p className="success">{info}</p> : null}
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password (min 8 characters)
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Register</button>
      </form>
      <p className="muted">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
