import { getTokenService } from './TokenService'
import { createLogger } from '../utils/logger'

const API_BASE = 'http://localhost:8080'

const log = createLogger('facilityService')

export interface Facility {
  id: string
  name?: string
  code?: string
  country?: string
  city?: string
}

export interface CreateFacilityRequest {
  name: string
  code: string
  country?: string
  city?: string
}

export interface RegisterFacilityRequest {
  email: string
  facilityName: string
  facilityCode: string
  country?: string
  city?: string
}

export interface FacilityRegistrationResponse {
  accountId?: string
  email?: string
  status?: string
  roles?: string[]
  facilityId?: string
  facilityName?: string
  facilityCode?: string
  invitationExpiresAt?: string
  message?: string
}

export interface UpdateFacilityRequest {
  name?: string
  code?: string
  country?: string
  city?: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = text || `Request failed (${response.status})`
    let fieldErrors: { field: string; message: string }[] | undefined
    try {
      if (text) {
        const data = JSON.parse(text) as {
          message?: string
          fieldErrors?: { field?: string; message?: string }[]
        }
        if (data?.message) message = data.message
        if (Array.isArray(data?.fieldErrors)) {
          fieldErrors = data.fieldErrors
            .filter((item) => item?.field && item?.message)
            .map((item) => ({ field: item.field as string, message: item.message as string }))
        }
      }
    } catch {
      // ignore JSON parse errors
    }
    log.error('Facility API error', { status: response.status, message, fieldErrors })
    const error = new Error(message) as Error & {
      status?: number
      fieldErrors?: { field: string; message: string }[]
    }
    error.status = response.status
    error.fieldErrors = fieldErrors
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function getFacilities(): Promise<Facility[]> {
  log.info('Fetching facilities')
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/facilities`)
  return handleResponse<Facility[]>(response)
}

export async function createFacility(payload: CreateFacilityRequest): Promise<Facility> {
  log.info('Creating facility', { code: payload.code })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/facilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<Facility>(response)
}

export async function registerFacility(payload: RegisterFacilityRequest): Promise<FacilityRegistrationResponse> {
  log.info('Registering facility', { facilityCode: payload.facilityCode })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/registration/facilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<FacilityRegistrationResponse>(response)
}

export async function updateFacility(id: string, payload: UpdateFacilityRequest): Promise<Facility> {
  log.info('Updating facility', { id })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/facilities/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<Facility>(response)
}

export async function deleteFacility(id: string): Promise<void> {
  log.warn('Deleting facility', { id })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/facilities/${id}`, {
    method: 'DELETE',
  })
  await handleResponse<void>(response)
}
