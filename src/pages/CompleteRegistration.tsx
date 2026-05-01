import React, { useState, useEffect } from 'react'
import { createLogger } from '../utils/logger'
import { completeRegistration, extractRegistrationToken, validateRegistrationToken } from '../services/registrationService'

const log = createLogger('CompleteRegistration')

export default function CompleteRegistration() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const extractedToken = extractRegistrationToken()
    log.info('CompleteRegistration component mounted', { hasToken: !!extractedToken })
    setToken(extractedToken)

    if (!extractedToken) {
      setValidating(false)
      return
    }

    // Validate the token
    const validate = async () => {
      try {
        const valid = await validateRegistrationToken(extractedToken)
        setTokenValid(valid)
        if (!valid) {
          log.warn('Invitation token is invalid or expired')
        }
      } catch (err) {
        log.error('Token validation network error', err)
        setTokenValid(false)
      } finally {
        setValidating(false)
      }
    }

    validate()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!token) {
      log.error('Complete registration attempted without token')
      return setError('Missing invitation token')
    }
    if (!password) {
      log.warn('Complete registration attempted without password')
      return setError('Please enter a password')
    }
    if (password.length < 8) {
      log.warn('Complete registration attempted with short password')
      return setError('Password must be at least 8 characters')
    }
    if (password !== confirm) {
      log.warn('Complete registration attempted with mismatched passwords')
      return setError('Passwords do not match')
    }

    log.info('Complete registration request started')
    setLoading(true)
    try {
      const result = await completeRegistration({ token, password })

      log.info('Registration completed successfully, redirecting to login')
      setSuccess(result.message || 'Registration complete! You will be redirected to sign in...')
      setTimeout(() => {
        localStorage.setItem('flash_password_changed', 'Registration complete. Please sign in with your new password.')
        window.history.pushState({}, '', '/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }, 1400)
    } catch (err: any) {
      log.error('Complete registration network error', err)
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-panel">
      <div className="card-header" style={{ justifyContent: 'center', marginBottom: 16 }}>
        <img src="/src/assets/mr-logo.svg" alt="Medical Records" className="main-logo" />
      </div>

      <h2 className="h1" style={{ marginTop: 0 }}>Complete your registration</h2>

      {validating ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Validating invitation...</p>
        </div>
      ) : !token ? (
        <div className="error" role="alert">No invitation token found in the URL. Please use the link from your invitation email.</div>
      ) : tokenValid === false ? (
        <div className="error" role="alert">This invitation link is invalid or has expired. Please contact your administrator to receive a new invitation.</div>
      ) : (
        <>
          <p className="muted">Set a password to activate your account.</p>

          {error && <div className="error" role="alert">{error}</div>}
          {success && (
            <div className="muted" role="status" style={{ background: '#f0fff4', padding: 10, borderRadius: 6, border: '1px solid #d6f5e0' }}>
              {success}
            </div>
          )}

          <form id="complete-registration-form" name="complete-registration-form" onSubmit={submit} style={{ marginTop: 12 }}>
            <div className="form-row">
              <label className="label">Password</label>
              <input
                id="new-password"
                name="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                autoComplete="new-password"
              />
            </div>

            <div className="form-row">
              <label className="label">Confirm password</label>
              <input
                id="confirm-password"
                name="confirm"
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>

            <div className="form-row">
              <button id="complete-submit" className="btn" type="submit" disabled={loading}>
                {loading ? 'Completing...' : 'Complete registration'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
