import React, { useEffect, useState } from 'react'
import { getPatientByHealthCareNumber } from '../services/patientService'
import type { RegisterDependantPayload } from '../services/patientService'

type GuardianshipType = 'PARENT' | 'LEGAL_GUARDIAN' | 'OTHER'

export type DependantFormValues = {
  givenName: string
  familyName: string
  dateOfBirth: string
  sex: string
  phone: string
  healthCareNumber: string
  ecName: string
  ecRelation: string
  ecPhone: string
  addrStreet: string
  addrCity: string
  addrRegion: string
  addrPostalCode: string
  addrCountry: string
  guardianHealthCareNumber: string
  guardianshipType: GuardianshipType | ''
  notes: string
}

type Props = {
  open: boolean
  isLoading?: boolean
  formError?: string | null
  fieldErrors?: Partial<Record<string, string>>
  onClose: () => void
  onSubmit: (payload: RegisterDependantPayload) => void
}

const emptyValues: DependantFormValues = {
  givenName: '',
  familyName: '',
  dateOfBirth: '',
  sex: '',
  phone: '',
  healthCareNumber: '',
  ecName: '',
  ecRelation: '',
  ecPhone: '',
  addrStreet: '',
  addrCity: '',
  addrRegion: '',
  addrPostalCode: '',
  addrCountry: '',
  guardianHealthCareNumber: '',
  guardianshipType: '',
  notes: '',
}

export default function DependantRegistrationDialog({
  open,
  isLoading = false,
  formError,
  fieldErrors,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<DependantFormValues>(emptyValues)
  const [guardianName, setGuardianName] = useState<string | null>(null)
  const [guardianLookupError, setGuardianLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(emptyValues)
      setGuardianName(null)
      setGuardianLookupError(null)
    }
  }, [open])

  if (!open) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear guardian lookup when health care number changes
    if (name === 'guardianHealthCareNumber') {
      setGuardianName(null)
      setGuardianLookupError(null)
    }
  }

  const handleLookupGuardian = async () => {
    const hcn = values.guardianHealthCareNumber.trim()
    if (!hcn) return
    try {
      setIsLookingUp(true)
      setGuardianLookupError(null)
      setGuardianName(null)
      const patient = await getPatientByHealthCareNumber(hcn)
      const name = [patient.demographics?.givenName, patient.demographics?.familyName]
        .filter(Boolean)
        .join(' ')
      setGuardianName(name || 'Patient found (no name)')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guardian not found'
      setGuardianLookupError(message)
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guardianName) return

    const sex = values.sex as 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' | undefined
    const hasEc = values.ecName || values.ecRelation || values.ecPhone
    const hasAddr = values.addrStreet || values.addrCity || values.addrRegion || values.addrPostalCode || values.addrCountry

    onSubmit({
      demographics: {
        givenName: values.givenName.trim(),
        familyName: values.familyName.trim(),
        dateOfBirth: values.dateOfBirth || undefined,
        sex: sex || undefined,
        phone: values.phone.trim() || undefined,
        healthCareNumber: values.healthCareNumber.trim() || undefined,
        emergencyContact: hasEc
          ? {
              name: values.ecName.trim() || undefined,
              relation: values.ecRelation.trim() || undefined,
              phone: values.ecPhone.trim() || undefined,
            }
          : undefined,
        address: hasAddr
          ? {
              street: values.addrStreet.trim() || undefined,
              city: values.addrCity.trim() || undefined,
              region: values.addrRegion.trim() || undefined,
              postalCode: values.addrPostalCode.trim() || undefined,
              country: values.addrCountry.trim() || undefined,
            }
          : undefined,
      },
      guardianHealthCareNumber: values.guardianHealthCareNumber.trim(),
      guardianshipType: values.guardianshipType as GuardianshipType,
      notes: values.notes.trim() || undefined,
    })
  }

  const canSubmit = !!guardianName && !!values.guardianshipType

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>Register Dependent</h3>
        </div>

        {formError && <div className="form-error">{formError}</div>}

        <div className="modal-section-header">Guardian</div>
        <div className="modal-grid">
          <label className="modal-label">
            Guardian health care number
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                name="guardianHealthCareNumber"
                className={`input${guardianLookupError || fieldErrors?.guardianHealthCareNumber ? ' input-error' : ''}`}
                value={values.guardianHealthCareNumber}
                onChange={handleChange}
                disabled={isLoading || isLookingUp}
                required
              />
              <button
                type="button"
                className="btn ghost inline"
                onClick={handleLookupGuardian}
                disabled={!values.guardianHealthCareNumber.trim() || isLoading || isLookingUp}
              >
                {isLookingUp ? '...' : 'Look up'}
              </button>
            </div>
            {guardianLookupError && <span className="field-error">{guardianLookupError}</span>}
            {fieldErrors?.guardianHealthCareNumber && (
              <span className="field-error">{fieldErrors.guardianHealthCareNumber}</span>
            )}
            {guardianName && <span className="field-hint">Guardian: {guardianName}</span>}
          </label>

          <label className="modal-label">
            Guardianship type
            <select
              name="guardianshipType"
              className={`input${fieldErrors?.guardianshipType ? ' input-error' : ''}`}
              value={values.guardianshipType}
              onChange={handleChange}
              disabled={isLoading}
              required
            >
              <option value="">Select type</option>
              <option value="PARENT">Parent</option>
              <option value="LEGAL_GUARDIAN">Legal guardian</option>
              <option value="OTHER">Other</option>
            </select>
            {fieldErrors?.guardianshipType && <span className="field-error">{fieldErrors.guardianshipType}</span>}
          </label>

          <label className="modal-label">
            Notes (optional)
            <input
              name="notes"
              className="input"
              value={values.notes}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="modal-section-header">Dependent Demographics</div>
        <div className="modal-grid">
          <label className="modal-label">
            Given name
            <input
              name="givenName"
              className={`input${fieldErrors?.givenName ? ' input-error' : ''}`}
              value={values.givenName}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
            {fieldErrors?.givenName && <span className="field-error">{fieldErrors.givenName}</span>}
          </label>

          <label className="modal-label">
            Family name
            <input
              name="familyName"
              className={`input${fieldErrors?.familyName ? ' input-error' : ''}`}
              value={values.familyName}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
            {fieldErrors?.familyName && <span className="field-error">{fieldErrors.familyName}</span>}
          </label>

          <label className="modal-label">
            Date of birth
            <input
              name="dateOfBirth"
              type="date"
              className="input"
              value={values.dateOfBirth}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>

          <label className="modal-label">
            Sex
            <select
              name="sex"
              className="input"
              value={values.sex}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="">Select sex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </label>

          <label className="modal-label">
            Phone
            <input
              name="phone"
              type="tel"
              className="input"
              value={values.phone}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>

          <label className="modal-label">
            Health care number
            <input
              name="healthCareNumber"
              className="input"
              value={values.healthCareNumber}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="modal-section-header">Emergency Contact</div>
        <div className="modal-grid">
          <label className="modal-label">
            Name
            <input name="ecName" className="input" value={values.ecName} onChange={handleChange} disabled={isLoading} />
          </label>
          <label className="modal-label">
            Relation
            <input name="ecRelation" className="input" value={values.ecRelation} onChange={handleChange} disabled={isLoading} />
          </label>
          <label className="modal-label">
            Phone
            <input name="ecPhone" type="tel" className="input" value={values.ecPhone} onChange={handleChange} disabled={isLoading} />
          </label>
        </div>

        <div className="modal-section-header">Address</div>
        <div className="modal-grid">
          <label className="modal-label">
            Street
            <input name="addrStreet" className="input" value={values.addrStreet} onChange={handleChange} disabled={isLoading} />
          </label>
          <label className="modal-label">
            City
            <input name="addrCity" className="input" value={values.addrCity} onChange={handleChange} disabled={isLoading} />
          </label>
          <label className="modal-label">
            Region / State
            <input name="addrRegion" className="input" value={values.addrRegion} onChange={handleChange} disabled={isLoading} />
          </label>
          <label className="modal-label">
            Postal code
            <input name="addrPostalCode" className="input" value={values.addrPostalCode} onChange={handleChange} disabled={isLoading} />
          </label>
          <label className="modal-label">
            Country
            <input name="addrCountry" className="input" value={values.addrCountry} onChange={handleChange} disabled={isLoading} />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn ghost inline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="btn inline" disabled={isLoading || !canSubmit}>
            {isLoading ? 'Registering...' : 'Register Dependent'}
          </button>
        </div>
      </form>
    </div>
  )
}
