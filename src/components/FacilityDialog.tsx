import React, { useEffect, useMemo, useState } from 'react'
import type { Facility } from '../services/facilityService'

type FacilityFormValues = {
  email: string
  name: string
  code: string
  country: string
  city: string
}

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  facility?: Facility | null
  isLoading?: boolean
  formError?: string | null
  fieldErrors?: Partial<Record<string, string>>
  onClose: () => void
  onSubmit: (values: FacilityFormValues) => void
}

const emptyValues: FacilityFormValues = {
  email: '',
  name: '',
  code: '',
  country: '',
  city: '',
}

export default function FacilityDialog({
  open,
  mode,
  facility,
  isLoading = false,
  formError,
  fieldErrors,
  onClose,
  onSubmit,
}: Props) {
  const initialValues = useMemo(() => {
    if (!facility) return emptyValues
    return {
      email: '',
      name: facility.name || '',
      code: facility.code || '',
      country: facility.country || '',
      city: facility.city || '',
    }
  }, [facility])

  const [values, setValues] = useState<FacilityFormValues>(initialValues)

  useEffect(() => {
    if (open) {
      setValues(initialValues)
    }
  }, [open, initialValues])

  if (!open) return null

  const isEdit = mode === 'edit'
  const emailError = fieldErrors?.email || fieldErrors?.facilityName && undefined
  const nameError = fieldErrors?.name || fieldErrors?.facilityName
  const codeError = fieldErrors?.code || fieldErrors?.facilityCode

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Facility' : 'Register Facility'}</h3>
        </div>
        {formError && <div className="form-error">{formError}</div>}
        <div className="modal-grid">
          {!isEdit && (
            <label className="modal-label">
              Admin Email
              <input
                className={`input${fieldErrors?.email ? ' input-error' : ''}`}
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              {fieldErrors?.email && <span className="field-error">{fieldErrors.email}</span>}
            </label>
          )}
          <label className="modal-label">
            Facility Name
            <input
              className={`input${nameError ? ' input-error' : ''}`}
              name="name"
              value={values.name}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
            {nameError && <span className="field-error">{nameError}</span>}
          </label>
          <label className="modal-label">
            Facility Code
            <input
              className={`input${codeError ? ' input-error' : ''}`}
              name="code"
              value={values.code}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
            {codeError && <span className="field-error">{codeError}</span>}
          </label>
          <label className="modal-label">
            Country
            <input
              className="input"
              name="country"
              value={values.country}
              onChange={handleChange}
              disabled={isLoading}
            />
          </label>
          <label className="modal-label">
            City
            <input
              className="input"
              name="city"
              value={values.city}
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
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Facility'}
          </button>
        </div>
      </form>
    </div>
  )
}
