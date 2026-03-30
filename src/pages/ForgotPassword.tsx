import React, { useState } from 'react'
import { createLogger } from '../utils/logger'

const log = createLogger('ForgotPassword')

const API_BASE = 'http://localhost:8080'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!email) {
      log.warn('Forgot password attempted without email')
      return setError('Please provide your email')
    }
    log.info('Forgot password request started', { email })
    setLoading(true)
    try {
      const body = new URLSearchParams({ email })
      log.debug('Sending forgot password request to API')
      const res = await fetch(`${API_BASE}/api/auth/password/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        log.warn('Forgot password request failed', { status: res.status, message: data?.message })
        setError(data?.message || `Request failed (${res.status})`)
        return
      }
      log.info('Forgot password request successful')
      setSuccess('If that email exists in our system you will receive a reset link shortly.')
    } catch (err: any) {
      log.error('Forgot password network error', err)
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    log.debug('Navigating back to login')
    // navigate back to login route and notify App via popstate
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="card-panel">
      <div className="card-header" style={{justifyContent:'center', marginBottom:16}}>
        <img src="/src/assets/mr-logo.svg" alt="Medical Records" className="main-logo" />
      </div>

      <h2 className="h1" style={{marginTop:0}}>Reset password</h2>
      <p className="muted">Enter the email for the account and we'll send a reset link.</p>

      {error && <div className="error" role="alert">{error}</div>}
      {success && <div className="muted" role="status" style={{background:'#f0fff4',padding:10,borderRadius:6,border:'1px solid #d6f5e0'}}>{success}</div>}

      <form id="forgot-form" name="forgot-form" onSubmit={submit} style={{marginTop:12}}>
        <div className="form-row">
          <label className="label">Email</label>
          <input id="forgot-email" name="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>

        <div className="form-row" style={{display:'flex',gap:12}}>
          <button id="forgot-submit" className="btn" type="submit" disabled={loading} style={{flex:1}}>{loading ? 'Sending...' : 'Send reset link'}</button>
          <button type="button" onClick={goBack} className="btn secondary" style={{flex:1}}>Back to sign in</button>
        </div>
      </form>

    </div>
  )
}
