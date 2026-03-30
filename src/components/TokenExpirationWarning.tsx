import { useState, useEffect, useCallback } from 'react'
import { getTokenService } from '../services/TokenService'
import { createLogger } from '../utils/logger'

const log = createLogger('TokenExpirationWarning')

// Show warning when less than this many seconds remain
const WARNING_THRESHOLD_SECONDS = 60

interface Props {
  onSessionExpired?: () => void
}

export default function TokenExpirationWarning({ onSessionExpired }: Props) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const checkTokenExpiration = useCallback(() => {
    const tokenService = getTokenService()
    const token = tokenService.getAccessToken()
    if (!token) {
      setShowWarning(false)
      return
    }

    // Only show warning when "remember me" is NOT enabled
    // When remember me is enabled, auto-refresh handles it silently
    if (tokenService.isRememberMeEnabled()) {
      setShowWarning(false)
      return
    }

    const seconds = tokenService.getSecondsUntilExpiry(token)
    
    if (seconds <= 0) {
      log.warn('Token has expired')
      setShowWarning(false)
      if (onSessionExpired) {
        onSessionExpired()
      }
      return
    }

    if (seconds <= WARNING_THRESHOLD_SECONDS) {
      if (!showWarning) {
        log.info('Token expiring soon, showing warning', { secondsRemaining: seconds })
      }
      setSecondsRemaining(seconds)
      setShowWarning(true)
    } else {
      setShowWarning(false)
      setSecondsRemaining(null)
    }
  }, [showWarning, onSessionExpired])

  useEffect(() => {
    // Check immediately
    checkTokenExpiration()

    // Then check every second
    const intervalId = setInterval(checkTokenExpiration, 1000)

    return () => clearInterval(intervalId)
  }, [checkTokenExpiration])

  const handleRefresh = async () => {
    log.info('User initiated token refresh')
    setIsRefreshing(true)
    
    try {
      const tokenService = getTokenService()
      const success = await tokenService.refreshAccessToken()
      if (success) {
        log.info('Token refresh successful')
        setShowWarning(false)
        setSecondsRemaining(null)
      } else {
        log.error('Token refresh failed')
        // If refresh fails and we have no valid token, session is expired
        if (!tokenService.isAuthenticated()) {
          if (onSessionExpired) {
            onSessionExpired()
          }
        }
      }
    } catch (error) {
      log.error('Token refresh error', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!showWarning || secondsRemaining === null) {
    return null
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${secs}s`
  }

  const hasRefreshToken = !!getTokenService().getRefreshToken()

  return (
    <div className="token-expiration-overlay">
      <div className="token-expiration-modal">
        <div className="token-expiration-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <h2 className="token-expiration-title">Session Expiring</h2>
        
        <div className="token-expiration-countdown">
          <span className="countdown-number">{formatTime(secondsRemaining)}</span>
        </div>
        
        <p className="token-expiration-message">
          Your session will expire soon. {hasRefreshToken ? 'Click the button below to extend your session.' : 'Please save your work and log in again.'}
        </p>

        {hasRefreshToken ? (
          <button 
            className="btn token-expiration-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Extend Session'}
          </button>
        ) : (
          <p className="token-expiration-no-refresh muted">
            No refresh token available. You will need to log in again.
          </p>
        )}
      </div>
    </div>
  )
}
