/**
 * TokenService - Handles JWT token management, expiration checking, and automatic refresh
 * 
 * Key behaviors:
 * - Access token expiration does NOT force logout
 * - Automatic refresh when API calls fail with 401
 * - On startup, attempts to restore session using refresh token
 * - "Remember me": 
 *   - Enabled: refresh token persisted in localStorage (survives browser restart)
 *   - Disabled: refresh token in sessionStorage (session-only, cleared on browser close)
 * - Only logs out when refresh token is invalid/expired/revoked
 */

import { createLogger } from '../utils/logger'

const log = createLogger('TokenService')

// How many seconds before expiration to trigger proactive refresh
const REFRESH_THRESHOLD_SECONDS = 60

export interface TokenServiceConfig {
  apiBase: string
  storagePrefix: string
  refreshEndpoint: string
}

export interface TokenPayload {
  sub?: string
  exp?: number
  iat?: number
  roles?: string[]
  [key: string]: unknown
}

export interface TokenRefreshResponse {
  accountId?: string
  email?: string
  roles?: string[]
  accessToken: string
  refreshToken: string
  tokenType?: string
}

type TokenUpdateCallback = (accessToken: string | null) => void
type SessionRestoredCallback = (success: boolean) => void
type SessionExpiredCallback = () => void

export class TokenService {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private rememberMe: boolean = false
  private refreshTimeoutId: ReturnType<typeof setTimeout> | null = null
  private onTokenUpdate: TokenUpdateCallback | null = null
  private onSessionExpired: SessionExpiredCallback | null = null
  private isRefreshing: boolean = false
  private refreshPromise: Promise<boolean> | null = null

  private readonly ACCESS_TOKEN_SESSION_KEY: string
  private readonly ACCESS_TOKEN_LOCAL_KEY: string
  private readonly REFRESH_TOKEN_SESSION_KEY: string
  private readonly REFRESH_TOKEN_LOCAL_KEY: string
  private readonly REMEMBER_ME_KEY: string
  private readonly apiBase: string
  private readonly refreshEndpoint: string

  constructor(config: TokenServiceConfig) {
    this.ACCESS_TOKEN_SESSION_KEY = `${config.storagePrefix}_token_session`
    this.ACCESS_TOKEN_LOCAL_KEY = `${config.storagePrefix}_token`
    this.REFRESH_TOKEN_SESSION_KEY = `${config.storagePrefix}_refresh_token_session`
    this.REFRESH_TOKEN_LOCAL_KEY = `${config.storagePrefix}_refresh_token`
    this.REMEMBER_ME_KEY = `${config.storagePrefix}_remember_me`
    this.apiBase = config.apiBase
    this.refreshEndpoint = config.refreshEndpoint
  }

  /**
   * Initialize the token service and attempt to restore session
   * @param onTokenUpdate - Callback when token changes
   * @param onSessionRestored - Callback when session restoration is complete
   * @param onSessionExpired - Callback when session has expired and user must log in
   */
  async initialize(
    onTokenUpdate?: TokenUpdateCallback,
    onSessionRestored?: SessionRestoredCallback,
    onSessionExpired?: SessionExpiredCallback
  ): Promise<void> {
    log.info('Initializing TokenService')
    this.onTokenUpdate = onTokenUpdate || null
    this.onSessionExpired = onSessionExpired || null

    // Load remember me preference
    this.rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true'
    log.debug('Remember me setting', { rememberMe: this.rememberMe })

    // Load tokens from storage
    this.loadTokensFromStorage()

    log.debug('Loaded tokens from storage', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      rememberMe: this.rememberMe
    })

    // If we have a refresh token, try to restore the session
    if (this.refreshToken) {
      log.info('Refresh token found, attempting to restore session')
      const success = await this.refreshAccessToken()
      
      if (success) {
        log.info('Session restored successfully')
        if (onSessionRestored) onSessionRestored(true)
      } else {
        log.warn('Failed to restore session, user must log in again')
        this.clearTokens()
        if (onSessionRestored) onSessionRestored(false)
      }
    } else if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
      // We have a valid access token but no refresh token
      log.info('Valid access token found (no refresh token)')
      this.scheduleTokenRefresh()
      if (onSessionRestored) onSessionRestored(true)
    } else {
      log.info('No valid session found')
      this.clearTokens()
      if (onSessionRestored) onSessionRestored(false)
    }
  }

  /**
   * Load tokens from appropriate storage based on remember me setting
   */
  private loadTokensFromStorage(): void {
    // Try to load access token (sessionStorage first, then localStorage)
    this.accessToken = 
      sessionStorage.getItem(this.ACCESS_TOKEN_SESSION_KEY) || 
      localStorage.getItem(this.ACCESS_TOKEN_LOCAL_KEY)

    // Load refresh token based on where it might be stored
    // Check both storages - if rememberMe was previously true, it's in localStorage
    // If rememberMe was false, it's in sessionStorage
    this.refreshToken = 
      localStorage.getItem(this.REFRESH_TOKEN_LOCAL_KEY) || 
      sessionStorage.getItem(this.REFRESH_TOKEN_SESSION_KEY)

    // Update rememberMe based on where we found the refresh token
    if (localStorage.getItem(this.REFRESH_TOKEN_LOCAL_KEY)) {
      this.rememberMe = true
    }
  }

  /**
   * Set tokens after login
   * @param accessToken - The JWT access token
   * @param refreshToken - The refresh token
   * @param remember - Whether to persist tokens across browser restarts
   */
  setTokens(accessToken: string, refreshToken?: string, remember?: boolean): void {
    log.info('Setting tokens', { hasRefreshToken: !!refreshToken, remember })
    
    this.accessToken = accessToken
    this.refreshToken = refreshToken || null
    this.rememberMe = remember ?? false

    // Store remember me preference
    try {
      localStorage.setItem(this.REMEMBER_ME_KEY, String(this.rememberMe))
    } catch (e) {
      log.error('Failed to store remember me preference', e)
    }

    // Always store access token in sessionStorage for current session
    try {
      sessionStorage.setItem(this.ACCESS_TOKEN_SESSION_KEY, accessToken)
      log.debug('Stored access token in sessionStorage')
    } catch (e) {
      log.error('Failed to store access token in sessionStorage', e)
    }

    // Store access token in localStorage if remember me is enabled
    if (this.rememberMe) {
      try {
        localStorage.setItem(this.ACCESS_TOKEN_LOCAL_KEY, accessToken)
        log.debug('Stored access token in localStorage')
      } catch (e) {
        log.error('Failed to store access token in localStorage', e)
      }
    } else {
      // Clear from localStorage if not remembering
      localStorage.removeItem(this.ACCESS_TOKEN_LOCAL_KEY)
    }

    // Store refresh token based on remember me setting
    if (refreshToken) {
      if (this.rememberMe) {
        // Persist across browser restarts
        try {
          localStorage.setItem(this.REFRESH_TOKEN_LOCAL_KEY, refreshToken)
          sessionStorage.removeItem(this.REFRESH_TOKEN_SESSION_KEY)
          log.debug('Stored refresh token in localStorage (persistent)')
        } catch (e) {
          log.error('Failed to store refresh token in localStorage', e)
        }
      } else {
        // Session-only - cleared when browser closes
        try {
          sessionStorage.setItem(this.REFRESH_TOKEN_SESSION_KEY, refreshToken)
          localStorage.removeItem(this.REFRESH_TOKEN_LOCAL_KEY)
          log.debug('Stored refresh token in sessionStorage (session-only)')
        } catch (e) {
          log.error('Failed to store refresh token in sessionStorage', e)
        }
      }
    }

    this.scheduleTokenRefresh()
    this.notifyTokenUpdate()
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken
  }

  /**
   * Check if user is authenticated (has tokens that could lead to a valid session)
   * The refresh flow will handle expired access tokens
   */
  isAuthenticated(): boolean {
    // User is considered authenticated if they have a refresh token
    // (even if access token is expired, we can refresh it)
    return !!(this.refreshToken || (this.accessToken && !this.isTokenExpired(this.accessToken)))
  }

  /**
   * Check if we can potentially restore a session (have a refresh token)
   */
  canRestoreSession(): boolean {
    return !!this.refreshToken
  }

  /**
   * Check if "remember me" is enabled (tokens persist across browser restarts)
   */
  isRememberMeEnabled(): boolean {
    return this.rememberMe
  }

  /**
   * Clear all tokens and cancel scheduled refresh
   */
  clearTokens(): void {
    log.info('Clearing all tokens')
    this.accessToken = null
    this.refreshToken = null

    if (this.refreshTimeoutId) {
      log.debug('Cancelling scheduled token refresh')
      clearTimeout(this.refreshTimeoutId)
      this.refreshTimeoutId = null
    }

    // Clear from all storage locations
    localStorage.removeItem(this.ACCESS_TOKEN_LOCAL_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_LOCAL_KEY)
    localStorage.removeItem(this.REMEMBER_ME_KEY)
    sessionStorage.removeItem(this.ACCESS_TOKEN_SESSION_KEY)
    sessionStorage.removeItem(this.REFRESH_TOKEN_SESSION_KEY)
    
    log.debug('Removed tokens from all storage locations')
    this.notifyTokenUpdate()
  }

  /**
   * Decode a JWT token payload (without verification)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const payload = parts[1]
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (e) {
      log.error('Failed to decode token', e)
      return null
    }
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (!payload?.exp) return true

    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  }

  /**
   * Get seconds until token expires
   */
  getSecondsUntilExpiry(token: string): number {
    const payload = this.decodeToken(token)
    if (!payload?.exp) return 0

    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, payload.exp - now)
  }

  /**
   * Check if token is close to expiring (within threshold)
   */
  isTokenExpiringSoon(token: string, thresholdSeconds: number = REFRESH_THRESHOLD_SECONDS): boolean {
    const secondsUntilExpiry = this.getSecondsUntilExpiry(token)
    return secondsUntilExpiry > 0 && secondsUntilExpiry <= thresholdSeconds
  }

  /**
   * Schedule proactive token refresh before expiration
   * Note: Only schedules auto-refresh when "remember me" is enabled.
   * When "remember me" is disabled, user must manually extend session via the warning modal.
   */
  private scheduleTokenRefresh(): void {
    // Clear any existing scheduled refresh
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId)
      this.refreshTimeoutId = null
    }

    if (!this.accessToken || !this.refreshToken) {
      log.debug('Cannot schedule refresh: missing tokens', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      })
      return
    }

    // When "remember me" is disabled, don't auto-refresh
    // User will see the expiration warning and must click to extend
    if (!this.rememberMe) {
      log.debug('Remember me disabled, skipping auto-refresh scheduling. User must manually extend session.')
      return
    }

    const secondsUntilExpiry = this.getSecondsUntilExpiry(this.accessToken)
    
    if (secondsUntilExpiry <= 0) {
      // Token already expired - don't force logout, just don't schedule
      // The refresh will happen when an API call is made
      log.debug('Access token already expired, refresh will happen on next API call')
      return
    }

    // Calculate when to refresh (before expiration)
    const refreshInSeconds = Math.max(1, secondsUntilExpiry - REFRESH_THRESHOLD_SECONDS)
    const refreshInMs = refreshInSeconds * 1000

    // Cap at 24 hours
    if (refreshInMs > 24 * 60 * 60 * 1000) {
      log.debug('Token expiry too far in future, will re-check in 1 hour')
      this.refreshTimeoutId = setTimeout(() => {
        this.scheduleTokenRefresh()
      }, 60 * 60 * 1000)
      return
    }

    log.info('Token refresh scheduled', { refreshInSeconds, secondsUntilExpiry })
    
    this.refreshTimeoutId = setTimeout(() => {
      log.info('Proactive token refresh triggered')
      this.refreshAccessToken()
    }, refreshInMs)
  }

  /**
   * Refresh the access token using the refresh token
   * Returns true if successful, false if refresh failed (user should be logged out)
   */
  async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for the existing refresh to complete
    if (this.isRefreshing && this.refreshPromise) {
      log.debug('Refresh already in progress, waiting for it to complete')
      return this.refreshPromise
    }

    if (!this.refreshToken) {
      log.warn('No refresh token available, cannot refresh')
      return false
    }

    this.isRefreshing = true
    log.info('Attempting to refresh access token')

    this.refreshPromise = this.doRefresh()
    const result = await this.refreshPromise
    
    this.isRefreshing = false
    this.refreshPromise = null
    
    return result
  }

  /**
   * Internal method to perform the actual refresh
   */
  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}${this.refreshEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (!response.ok) {
        const status = response.status
        log.error('Token refresh failed', { status, statusText: response.statusText })
        
        // 401 = invalid/expired refresh token - user must log in again
        if (status === 401 || status === 403) {
          log.warn('Refresh token is invalid or expired, user must log in again')
          this.clearTokens()
          // Notify that session has expired
          if (this.onSessionExpired) {
            this.onSessionExpired()
          }
          return false
        }
        
        // For other errors (500, network issues), don't clear tokens
        // The access token might still be valid or we can retry later
        log.warn('Refresh failed with non-auth error, keeping existing tokens')
        return false
      }

      const data: TokenRefreshResponse = await response.json()
      
      if (!data.accessToken) {
        log.error('No access token in refresh response', data)
        return false
      }

      log.debug('Received new tokens from refresh', { 
        hasNewRefreshToken: !!data.refreshToken 
      })

      // Update tokens in memory
      this.accessToken = data.accessToken
      if (data.refreshToken) {
        this.refreshToken = data.refreshToken
      }

      // Update storage
      this.updateStoredTokens(data.accessToken, data.refreshToken)

      // Schedule next refresh
      this.scheduleTokenRefresh()
      
      // Notify listeners
      this.notifyTokenUpdate()

      log.info('Token successfully refreshed')
      return true
    } catch (error) {
      log.error('Token refresh network error', error)
      // Network error - don't clear tokens, user might be offline temporarily
      return false
    }
  }

  /**
   * Update stored tokens after refresh
   */
  private updateStoredTokens(accessToken: string, refreshToken?: string): void {
    // Update access token in sessionStorage
    try {
      sessionStorage.setItem(this.ACCESS_TOKEN_SESSION_KEY, accessToken)
    } catch (e) {
      log.error('Failed to update sessionStorage access token', e)
    }

    // Update localStorage if remember me is enabled
    if (this.rememberMe) {
      try {
        localStorage.setItem(this.ACCESS_TOKEN_LOCAL_KEY, accessToken)
      } catch (e) {
        log.error('Failed to update localStorage access token', e)
      }
    }

    // Update refresh token if a new one was provided
    if (refreshToken) {
      if (this.rememberMe) {
        try {
          localStorage.setItem(this.REFRESH_TOKEN_LOCAL_KEY, refreshToken)
        } catch (e) {
          log.error('Failed to update localStorage refresh token', e)
        }
      } else {
        try {
          sessionStorage.setItem(this.REFRESH_TOKEN_SESSION_KEY, refreshToken)
        } catch (e) {
          log.error('Failed to update sessionStorage refresh token', e)
        }
      }
    }
  }

  /**
   * Notify listeners of token update
   */
  private notifyTokenUpdate(): void {
    if (this.onTokenUpdate) {
      this.onTokenUpdate(this.accessToken)
    }
  }

  /**
   * Get authorization header value
   */
  getAuthHeader(): string | null {
    if (!this.accessToken) return null
    return `Bearer ${this.accessToken}`
  }

  /**
   * Make an authenticated fetch request with automatic token refresh on 401
   * This is the main method that should be used for all authenticated API calls
   */
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    log.debug('Making authenticated request', { url, method: options.method || 'GET' })

    // If access token is expired or missing but we have a refresh token, refresh first
    if (this.refreshToken && (!this.accessToken || this.isTokenExpired(this.accessToken))) {
      log.info('Access token expired/missing, refreshing before request')
      const refreshed = await this.refreshAccessToken()
      if (!refreshed) {
        log.error('Failed to refresh token before request')
        throw new Error('Session expired. Please log in again.')
      }
    }

    const authHeader = this.getAuthHeader()
    if (!authHeader) {
      log.error('No authentication token available for request', { url })
      throw new Error('No authentication token available')
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', authHeader)

    let response = await fetch(url, {
      ...options,
      headers,
    })

    log.debug('Request completed', { url, status: response.status })

    // If we get a 401 and have a refresh token, try to refresh and retry
    if (response.status === 401 && this.refreshToken) {
      log.warn('Received 401, attempting token refresh and retry', { url })
      
      const refreshed = await this.refreshAccessToken()
      
      if (refreshed) {
        // Retry the request with new token
        const newAuthHeader = this.getAuthHeader()
        if (newAuthHeader) {
          headers.set('Authorization', newAuthHeader)
          log.debug('Retrying request with refreshed token', { url })
          response = await fetch(url, {
            ...options,
            headers,
          })
        }
      } else {
        // Refresh failed - session is invalid
        log.error('Token refresh failed, session is invalid')
        throw new Error('Session expired. Please log in again.')
      }
    }

    return response
  }
}

// Singleton management
let _tokenService: TokenService | null = null

export function initTokenService(config: TokenServiceConfig): TokenService {
  _tokenService = new TokenService(config)
  return _tokenService
}

export function getTokenService(): TokenService {
  if (!_tokenService) {
    throw new Error('TokenService not initialized. Call initTokenService(config) first.')
  }
  return _tokenService
}

export default TokenService
