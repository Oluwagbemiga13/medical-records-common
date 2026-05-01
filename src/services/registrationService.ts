import { createLogger } from '../utils/logger'

const log = createLogger('registrationService')

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080'

export type CompleteRegistrationRequest = {
  token: string
  password: string
}

export type CompletedRegistrationResponse = {
  accountId?: string
  email?: string
  status?: 'INVITED' | 'ACTIVE' | 'LOCKED' | 'DISABLED'
  roles?: Array<'PATIENT' | 'STAFF' | 'PROVIDER' | 'ADMIN' | 'FACILITY'>
  message?: string
}

export function extractRegistrationToken(): string | null {
  const queryToken = new URLSearchParams(window.location.search).get('token')
  if (queryToken) {
    log.debug('Token extracted from query parameter')
    return queryToken
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean)
  const routeIndex = pathParts.indexOf('complete-registration')
  if (routeIndex >= 0 && pathParts.length > routeIndex + 1) {
    log.debug('Token extracted from URL path')
    return pathParts[routeIndex + 1]
  }

  log.warn('No registration token found in URL')
  return null
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  if (!text) return `Request failed (${response.status})`

  try {
    const data = JSON.parse(text) as { message?: string }
    return data?.message || text
  } catch {
    return text
  }
}

export async function validateRegistrationToken(token: string): Promise<boolean> {
  const url = `${API_BASE}/api/registration/validate-token?token=${encodeURIComponent(token)}`
  const response = await fetch(url)

  if (!response.ok) {
    const message = await readErrorMessage(response)
    log.warn('Token validation request failed', { status: response.status, message })
    throw new Error(message)
  }

  const isValid = (await response.json()) === true
  if (!isValid) {
    log.warn('Token validation returned invalid')
  }

  return isValid
}

export async function completeRegistration(payload: CompleteRegistrationRequest): Promise<CompletedRegistrationResponse> {
  const response = await fetch(`${API_BASE}/api/registration/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    log.error('Complete registration failed', { status: response.status, message })
    throw new Error(message)
  }

  return response.json() as Promise<CompletedRegistrationResponse>
}
