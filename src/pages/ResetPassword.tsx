import React, { useState, useEffect } from 'react'
import { createLogger } from '../utils/logger'

const log = createLogger('ResetPassword')

const API_BASE = 'http://localhost:8080'

function extractToken(): string | null {
  // Support either ?token=... or /reset-password/<token>
  const qp = new URLSearchParams(window.location.search).get('token')
  if (qp) {
    log.debug('Token extracted from query parameter')
    return qp
  }
  const parts = window.location.pathname.split('/').filter(Boolean)
  // find last segment after reset-password
  const idx = parts.indexOf('reset-password')
  if (idx >= 0 && parts.length > idx + 1) {
    log.debug('Token extracted from URL path')
    return parts[idx + 1]
  }
  log.warn('No token found in URL')
  return null
}

export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const extractedToken = extractToken()
    log.info('ResetPassword component mounted', { hasToken: !!extractedToken })
    setToken(extractedToken)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!token) {
      log.error('Reset password attempted without token')
      return setError('Missing reset token')
    }
    if (!password) {
      log.warn('Reset password attempted without password')
      return setError('Please enter a new password')
    }
    if (password.length < 8) {
      log.warn('Reset password attempted with short password')
      return setError('Password must be at least 8 characters')
    }
    if (password !== confirm) {
      log.warn('Reset password attempted with mismatched passwords')
      return setError('Passwords do not match')
    }

    log.info('Reset password request started')
    setLoading(true)
    try {
      const payload = { token: token || '', newPassword: password }
      log.debug('Sending reset password request to API')
      const res = await fetch(`${API_BASE}/api/auth/password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      // try reading JSON first, otherwise fall back to plain text for better debugging
      let data: any = null
      try {
        data = await res.json()
      } catch (e) {
        try {
          data = await res.text()
        } catch (e2) {
          data = null
        }
      }

      if (!res.ok) {
        const msg = (data && typeof data === 'object') ? (data.message || JSON.stringify(data)) : (data || `Request failed (${res.status})`)
        log.error('Reset password failed', { status: res.status, body: data })
        setError(msg)
        return
      }
      // show success message then redirect after a short delay
      log.info('Password reset successful, redirecting to login')
      setSuccess('Password updated. You will be redirected to sign in...')
      setTimeout(() => {
        localStorage.setItem('flash_password_changed', 'Password updated. Please sign in with your new password.')
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }, 1400)
    } catch (err: any) {
      log.error('Reset password network error', err)
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

      <h2 className="h1" style={{marginTop:0}}>Choose a new password</h2>
      <p className="muted">Enter a new password for your account.{!token && ' Missing token in URL.'}</p>

      {error && <div className="error" role="alert">{error}</div>}
      {success && <div className="muted" role="status" style={{background:'#f0fff4',padding:10,borderRadius:6,border:'1px solid #d6f5e0'}}>{success}</div>}

      <form id="reset-form" name="reset-form" onSubmit={submit} style={{marginTop:12}}>
        <div className="form-row">
          <label className="label">New password</label>
          <input id="new-password" name="password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" autoComplete="new-password" />
        </div>

        <div className="form-row">
          <label className="label">Confirm password</label>
          <input id="confirm-password" name="confirm" className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" autoComplete="new-password" />
        </div>

        <div className="form-row">
          <button id="reset-submit" className="btn" type="submit" disabled={loading || !token}>{loading ? 'Updating...' : 'Update password'}</button>
        </div>
      </form>

    </div>
  )
}
