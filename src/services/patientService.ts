import { getTokenService } from './TokenService'
import { createLogger } from '../utils/logger'

const log = createLogger('patientService')

export type EmergencyContact = {
  name?: string
  relation?: string
  phone?: string
}

export type Address = {
  street?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

export type PatientDemographics = {
  givenName: string
  familyName: string
  dateOfBirth?: string
  sex?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN'
  phone?: string
  healthCareNumber?: string
  emergencyContact?: EmergencyContact
  address?: Address
}

export type Patient = {
  id: string
  demographics?: PatientDemographics
  accountId?: string
  createdAt?: string
}

export type CreatePatientPayload = {
  demographics: PatientDemographics
  accountId?: string
}

export type UpdatePatientPayload = {
  demographics?: PatientDemographics
  accountId?: string
}

export type RegisterPatientPayload = {
  email: string
  demographics: PatientDemographics
  existingPatientId?: string
}

export type PatientRegistrationResponse = {
  accountId?: string
  email?: string
  status?: string
  roles?: string[]
  patientId?: string
  invitationExpiresAt?: string
  message?: string
}

export type RegisterDependantPayload = {
  demographics: PatientDemographics
  guardianHealthCareNumber: string
  guardianshipType: 'PARENT' | 'LEGAL_GUARDIAN' | 'OTHER'
  notes?: string
}

export type DependantRegistrationResponse = {
  patientId?: string
  givenName?: string
  familyName?: string
  guardianPatientId?: string
  guardianGivenName?: string
  guardianFamilyName?: string
  guardianshipType?: string
  guardianshipId?: string
  message?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = text || `Request failed (${response.status})`
    let fieldErrors: { field: string; message: string }[] | undefined
    try {
      if (text) {
        const data = JSON.parse(text) as { message?: string; fieldErrors?: { field?: string; message?: string }[] }
        if (data?.message) message = data.message
        if (Array.isArray(data?.fieldErrors)) {
          fieldErrors = data.fieldErrors
            .filter((item) => item?.field && item?.message)
            .map((item) => ({ field: item.field as string, message: item.message as string }))
        }
      }
    } catch {
      // ignore parse error
    }
    log.error('Patient API error', { status: response.status, message, fieldErrors })
    const error = new Error(message) as Error & { status?: number; fieldErrors?: { field: string; message: string }[] }
    error.status = response.status
    error.fieldErrors = fieldErrors
    throw error
  }

  if (response.status === 204) return undefined as unknown as T
  return response.json() as Promise<T>
}

export async function getAllPatients(): Promise<Patient[]> {
  log.info('Fetching all patients')
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/patients`)
  return handleResponse<Patient[]>(response)
}

export async function getPatientById(id: string): Promise<Patient> {
  log.info('Fetching patient by ID', { id })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/patients/${encodeURIComponent(id)}`)
  return handleResponse<Patient>(response)
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
  log.info('Creating patient')
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<Patient>(response)
}

export async function updatePatient(id: string, payload: UpdatePatientPayload): Promise<Patient> {
  log.info('Updating patient', { id })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/patients/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<Patient>(response)
}

export async function deletePatient(id: string): Promise<void> {
  log.warn('Deleting patient', { id })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/patients/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  await handleResponse<void>(response)
}

export async function getPatientByHealthCareNumber(healthCareNumber: string): Promise<Patient> {
  log.info('Fetching patient by health care number', { healthCareNumber })
  const response = await getTokenService().fetchWithAuth(
    `${API_BASE}/api/patients/by-health-care-number/${encodeURIComponent(healthCareNumber)}`,
  )
  return handleResponse<Patient>(response)
}

export async function registerPatient(payload: RegisterPatientPayload): Promise<PatientRegistrationResponse> {
  log.info('Registering patient', { email: payload.email })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/registration/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<PatientRegistrationResponse>(response)
}

export async function registerDependant(payload: RegisterDependantPayload): Promise<DependantRegistrationResponse> {
  log.info('Registering dependant', { guardianHealthCareNumber: payload.guardianHealthCareNumber })
  const response = await getTokenService().fetchWithAuth(`${API_BASE}/api/registration/dependants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<DependantRegistrationResponse>(response)
}
