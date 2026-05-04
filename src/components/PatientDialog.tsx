import React, { useEffect, useMemo, useState } from 'react'
import type { Patient } from '../services/patientService'

export type PatientFormValues = {
  email: string
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
}

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  patient?: Patient | null
  isLoading?: boolean
  formError?: string | null
  fieldErrors?: Partial<Record<string, string>>
  onClose: () => void
  onSubmit: (values: PatientFormValues) => void
}

const emptyValues: PatientFormValues = {
  email: '',
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
}

export default function PatientDialog({
  open,
  mode,
  patient,
  isLoading = false,
  formError,
  fieldErrors,
  onClose,
  onSubmit,
}: Props) {
  const initialValues = useMemo<PatientFormValues>(() => {
    if (!patient) return emptyValues
    const d = patient.demographics
    const ec = d?.emergencyContact
    const addr = d?.address
    return {
      email: '',
      givenName: d?.givenName || '',
      familyName: d?.familyName || '',
      dateOfBirth: d?.dateOfBirth || '',
      sex: d?.sex || '',
      phone: d?.phone || '',
      healthCareNumber: d?.healthCareNumber || '',
      ecName: ec?.name || '',
      ecRelation: ec?.relation || '',
      ecPhone: ec?.phone || '',
      addrStreet: addr?.street || '',
      addrCity: addr?.city || '',
      addrRegion: addr?.region || '',
      addrPostalCode: addr?.postalCode || '',
      addrCountry: addr?.country || '',
    }
  }, [patient])

  const [values, setValues] = useState<PatientFormValues>(initialValues)

  useEffect(() => {
    if (open) {
      setValues(mode === 'edit' ? initialValues : emptyValues)
    }
  }, [open, mode, initialValues])

  if (!open) return null

  const isEdit = mode === 'edit'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Patient' : 'New Patient'}</h3>
        </div>

        {formError && <div className="form-error">{formError}</div>}

        <div className="modal-grid">
          {!isEdit && (
            <label className="modal-label">
              Email
              <input
                name="email"
                type="email"
                className={`input${fieldErrors?.email ? ' input-error' : ''}`}
                value={values.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              {fieldErrors?.email && <span className="field-error">{fieldErrors.email}</span>}
            </label>
          )}

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
              className={`input${fieldErrors?.dateOfBirth ? ' input-error' : ''}`}
              value={values.dateOfBirth}
              onChange={handleChange}
              disabled={isLoading}
            />
            {fieldErrors?.dateOfBirth && <span className="field-error">{fieldErrors.dateOfBirth}</span>}
          </label>

          <label className="modal-label">
            Sex
            <select
              name="sex"
              className={`input${fieldErrors?.sex ? ' input-error' : ''}`}
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
            {fieldErrors?.sex && <span className="field-error">{fieldErrors.sex}</span>}
          </label>

          <label className="modal-label">
            Phone
            <input
              name="phone"
              type="tel"
              className={`input${fieldErrors?.phone ? ' input-error' : ''}`}
              value={values.phone}
              onChange={handleChange}
              disabled={isLoading}
            />
            {fieldErrors?.phone && <span className="field-error">{fieldErrors.phone}</span>}
          </label>

          <label className="modal-label">
            Health care number
            <input
              name="healthCareNumber"
              className={`input${fieldErrors?.healthCareNumber ? ' input-error' : ''}`}
              value={values.healthCareNumber}
              onChange={handleChange}
              disabled={isLoading}
            />
            {fieldErrors?.healthCareNumber && <span className="field-error">{fieldErrors.healthCareNumber}</span>}
          </label>
        </div>

        <div className="modal-section-header">Emergency Contact</div>
        <div className="modal-grid">
          <label className="modal-label">
            Name
            <input
              name="ecName"
              className="input"
              value={values.ecName}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            Relation
            <input
              name="ecRelation"
              className="input"
              value={values.ecRelation}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            Phone
            <input
              name="ecPhone"
              type="tel"
              className="input"
              value={values.ecPhone}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="modal-section-header">Address</div>
        <div className="modal-grid">
          <label className="modal-label">
            Street
            <input
              name="addrStreet"
              className="input"
              value={values.addrStreet}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            City
            <input
              name="addrCity"
              className="input"
              value={values.addrCity}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            Region / State
            <input
              name="addrRegion"
              className="input"
              value={values.addrRegion}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            Postal code
            <input
              name="addrPostalCode"
              className="input"
              value={values.addrPostalCode}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            Country
            <input
              name="addrCountry"
              className="input"
              value={values.addrCountry}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn ghost inline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="btn inline" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
