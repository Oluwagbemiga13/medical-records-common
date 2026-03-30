import React, {useState, useEffect} from 'react'
import { createLogger } from '../utils/logger'

const log = createLogger('Login')

type Props = {
  loginEndpoint: string
  title?: string
  subtitle?: string
  onSuccess: (accessToken: string, refreshToken: string | undefined, remember: boolean) => void
}

const API_BASE = 'http://localhost:8080'

export default function Login({loginEndpoint, title = 'Sign In', subtitle = 'Sign in to your account.', onSuccess}: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const f = localStorage.getItem('flash_password_changed')
    if (f) {
      setFlash(f)
      localStorage.removeItem('flash_password_changed')
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    log.info('Login attempt started', { email, remember })
    try {
      log.debug('Sending login request to API')
      const res = await fetch(`${API_BASE}${loginEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // if backend returns structured error, prefer its message
        const msg = data?.message || (data?.error ? `${data.error}` : `Login failed (${res.status})`)
        log.warn('Login failed', { status: res.status, message: msg })
        setError(msg)
        setLoading(false)
        return
      }

      log.debug('Login response received', { hasAccessToken: !!data?.accessToken, hasRefreshToken: !!data?.refreshToken })

      // try common token fields
      const accessToken = data?.accessToken || data?.token || data?.jwt || data?.access_token
      if (!accessToken) {
        log.error('Login succeeded but no token in response', data)
        setError('Login succeeded but no token received')
        setLoading(false)
        return
      }

      // Always get refresh token - TokenService handles storage based on "remember" flag
      // When remember=true: stored in localStorage (persists)
      // When remember=false: stored in sessionStorage (cleared on browser close)
      const refreshToken = data?.refreshToken || data?.refresh_token

      log.info('Login successful', { hasRefreshToken: !!refreshToken, remember })
      onSuccess(accessToken, refreshToken, remember)
    } catch (err: any) {
      log.error('Login network error', err)
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-panel">
      <div className="card-header" style={{justifyContent:'center', marginBottom:16}}>
        <img src="/src/assets/mr-logo.svg" alt="Medical Records" className="main-logo" />
      </div>

      <h2 className="h1" style={{marginTop:0}}>{title}</h2>
      <p className="muted">{subtitle}</p>

      {error && <div className="error" role="alert">{error}</div>}
      {flash && <div role="status" style={{background:'#f0fff4',padding:10,borderRadius:6,border:'1px solid #d6f5e0',marginBottom:12,color:'#063248'}}>{flash}</div>}

      <form id="login-form" onSubmit={submit}>
        <div className="form-row">
          <label className="label">Email</label>
          <div className="field-with-icon">
            <span className="input-icon" aria-hidden="true">{
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8.5L12 13L21 8.5" stroke="#4b6b7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#c6dbe7" strokeWidth="1.2" />
              </svg>
            }</span>
            <input id="email" aria-label="email" name="email" type="email" autoComplete="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>

        <div className="form-row">
          <label className="label">Password</label>
          <div className="field-with-icon">
            <span className="input-icon" aria-hidden="true">{
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="10" rx="2" stroke="#c6dbe7" strokeWidth="1.2" />
                <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="#4b6b7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }</span>
            <input id="password" aria-label="password" name="password" autoComplete="current-password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" />
          </div>
        </div>

        <div className="form-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8}} className="muted">
            <input id="remember" type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
            Remember me
          </label>
          <a href="/forgot-password" className="muted" style={{textDecoration:'underline',fontSize:13}}>Forgot password?</a>
        </div>

        <div className="form-row">
          <button id="login-submit" className="btn" type="submit" disabled={loading} aria-disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
