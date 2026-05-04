// Utils
export { createLogger } from './utils/logger'
export type { Logger } from './utils/logger'

// Services - TokenService
export { TokenService, initTokenService, getTokenService } from './services/TokenService'
export type { TokenServiceConfig, TokenPayload, TokenRefreshResponse } from './services/TokenService'

// Services - Registration
export {
  extractRegistrationToken,
  validateRegistrationToken,
  completeRegistration,
} from './services/registrationService'
export type {
  CompleteRegistrationRequest,
  CompletedRegistrationResponse,
} from './services/registrationService'

// Services - Facility
export {
  getFacilities,
  createFacility,
  registerFacility,
  updateFacility,
  deleteFacility,
} from './services/facilityService'
export type {
  Facility,
  CreateFacilityRequest,
  RegisterFacilityRequest,
  FacilityRegistrationResponse,
  UpdateFacilityRequest,
} from './services/facilityService'

// Services - Patient
export {
  getAllPatients,
  getPatientById,
  getPatientByHealthCareNumber,
  createPatient,
  updatePatient,
  deletePatient,
  registerPatient,
  registerDependant,
} from './services/patientService'
export type {
  Patient,
  PatientDemographics,
  EmergencyContact,
  Address,
  CreatePatientPayload,
  UpdatePatientPayload,
  RegisterPatientPayload,
  PatientRegistrationResponse,
  RegisterDependantPayload,
  DependantRegistrationResponse,
} from './services/patientService'

// Components
export { default as ConfirmDialog } from './components/ConfirmDialog'
export { default as FacilitiesTable } from './components/FacilitiesTable'
export { default as FacilityDialog } from './components/FacilityDialog'
export { default as PatientsTable } from './components/PatientsTable'
export { default as PatientDialog } from './components/PatientDialog'
export type { PatientFormValues } from './components/PatientDialog'
export { default as DependantRegistrationDialog } from './components/DependantRegistrationDialog'
export { default as TokenExpirationWarning } from './components/TokenExpirationWarning'
export { default as Login } from './components/Login'
export { default as Menu } from './components/Menu'
export type { MenuItem } from './components/Menu'

// Pages
export { default as ForgotPassword } from './pages/ForgotPassword'
export { default as ResetPassword } from './pages/ResetPassword'
export { default as CompleteRegistration } from './pages/CompleteRegistration'
export { default as FacilitiesPage } from './pages/FacilitiesPage'
