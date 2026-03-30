import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import FacilityDialog from '../components/FacilityDialog'
import FacilitiesTable from '../components/FacilitiesTable'
import {
  registerFacility,
  deleteFacility,
  getFacilities,
  updateFacility,
  type Facility,
} from '../services/facilityService'
import { createLogger } from '../utils/logger'

const log = createLogger('FacilitiesPage')

type Props = {
  onNavigateHome: () => void
  onLogout: () => void
}

type FacilityFormValues = {
  email: string
  name: string
  code: string
  country: string
  city: string
}

type FieldErrors = Partial<Record<string, string>>

export default function FacilitiesPage({ onNavigateHome, onLogout }: Props) {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Facility | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null)
  const [confirmEdit, setConfirmEdit] = useState<Facility | null>(null)

  const countryOptions = useMemo(() => {
    const countries = new Set<string>()
    facilities.forEach((facility) => {
      if (facility.country) countries.add(facility.country)
    })
    return Array.from(countries).sort((a, b) => a.localeCompare(b))
  }, [facilities])

  const cityOptions = useMemo(() => {
    const cities = new Set<string>()
    facilities.forEach((facility) => {
      if (facility.city) cities.add(facility.city)
    })
    return Array.from(cities).sort((a, b) => a.localeCompare(b))
  }, [facilities])

  const filteredFacilities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return facilities.filter((facility) => {
      const matchesCountry =
        countryFilter === 'all' || facility.country === countryFilter
      const matchesCity = cityFilter === 'all' || facility.city === cityFilter
      if (!matchesCountry || !matchesCity) return false
      if (!normalizedSearch) return true
      const haystack = [
        facility.name,
        facility.code,
        facility.country,
        facility.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [facilities, searchTerm, countryFilter, cityFilter])

  const facilityCountLabel = useMemo(() => {
    if (isLoading) return 'Loading facilities...'
    const filteredCount = filteredFacilities.length
    if (filteredCount === facilities.length) {
      return `${facilities.length} facility${facilities.length === 1 ? '' : 'ies'}`
    }
    return `${filteredCount} of ${facilities.length} facilities`
  }, [facilities.length, filteredFacilities.length, isLoading])

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        setIsLoading(true)
        const data = await getFacilities()
        setFacilities(data)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load facilities'
        log.error('Failed to load facilities', err)
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFacilities()
  }, [])

  const handleCreate = async (values: FacilityFormValues) => {
    try {
      setIsWorking(true)
      setFormError(null)
      setFieldErrors({})
      const result = await registerFacility({
        email: values.email.trim(),
        facilityName: values.name.trim(),
        facilityCode: values.code.trim(),
        country: values.country.trim() || undefined,
        city: values.city.trim() || undefined,
      })
      // Build optimistic Facility from registration response
      const created: Facility = {
        id: result.facilityId || '',
        name: result.facilityName || values.name.trim(),
        code: result.facilityCode || values.code.trim(),
        country: values.country.trim() || undefined,
        city: values.city.trim() || undefined,
      }
      setFacilities((prev) => [created, ...prev])
      setIsCreateOpen(false)
      setSuccessMessage(result.message || 'Facility registered. An invitation email has been sent.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register facility'
      const apiErrors = (err as Error & { fieldErrors?: { field: string; message: string }[] })
        .fieldErrors
      if (apiErrors?.length) {
        const nextFieldErrors: FieldErrors = {}
        apiErrors.forEach((item) => {
          // Map registration field names to form field names
          if (item.field === 'facilityName') nextFieldErrors.name = item.message
          else if (item.field === 'facilityCode') nextFieldErrors.code = item.message
          else nextFieldErrors[item.field] = item.message
        })
        setFieldErrors(nextFieldErrors)
        setFormError(message)
      } else {
        setError(message)
      }
    } finally {
      setIsWorking(false)
    }
  }

  const handleConfirmEdit = async (values: FacilityFormValues) => {
    if (!editTarget) return

    try {
      setIsWorking(true)
      setFormError(null)
      setFieldErrors({})
      const updated = await updateFacility(editTarget.id, {
        name: values.name.trim() || undefined,
        code: values.code.trim() || undefined,
        country: values.country.trim() || undefined,
        city: values.city.trim() || undefined,
      })
      setFacilities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setEditTarget(null)
      setSuccessMessage('Facility updated successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update facility'
      const apiErrors = (err as Error & { fieldErrors?: { field: string; message: string }[] })
        .fieldErrors
      if (apiErrors?.length) {
        const nextFieldErrors: FieldErrors = {}
        apiErrors.forEach((item) => {
          if (item.field === 'name' || item.field === 'code') {
            nextFieldErrors[item.field] = item.message
          }
        })
        setFieldErrors(nextFieldErrors)
        setFormError(message)
      } else {
        setError(message)
      }
    } finally {
      setIsWorking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return

    try {
      setIsWorking(true)
      await deleteFacility(confirmDelete.id)
      setFacilities((prev) => prev.filter((facility) => facility.id !== confirmDelete.id))
      setConfirmDelete(null)
      setSuccessMessage('Facility deleted successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete facility'
      setError(message)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2>Facility Management</h2>
          <div className="muted">{facilityCountLabel}</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost inline" onClick={onNavigateHome}>
            Back to Menu
          </button>
          <button
            className="btn inline"
            onClick={() => {
              setFormError(null)
              setFieldErrors({})
              setSuccessMessage(null)
              setIsCreateOpen(true)
            }}
          >
            New Facility
          </button>
          <button className="btn secondary inline" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success">{successMessage}</div>}

      <div className="filter-bar">
        <div className="filter-field">
          <label className="filter-label" htmlFor="facility-search">
            Search
          </label>
          <input
            id="facility-search"
            className="input"
            placeholder="Search by name, code, city..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label className="filter-label" htmlFor="facility-country">
            Country
          </label>
          <select
            id="facility-country"
            className="input"
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
          >
            <option value="all">All countries</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label className="filter-label" htmlFor="facility-city">
            City
          </label>
          <select
            id="facility-city"
            className="input"
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
          >
            <option value="all">All cities</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn ghost inline"
          onClick={() => {
            setSearchTerm('')
            setCountryFilter('all')
            setCityFilter('all')
          }}
        >
          Clear Filters
        </button>
      </div>

      <div className="page-card">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading facilities...</p>
          </div>
        ) : (
          <FacilitiesTable
            facilities={filteredFacilities}
            onEdit={(facility) => setConfirmEdit(facility)}
            onDelete={(facility) => setConfirmDelete(facility)}
          />
        )}
      </div>

      <FacilityDialog
        open={isCreateOpen}
        mode="create"
        isLoading={isWorking}
        formError={formError}
        fieldErrors={fieldErrors}
        onClose={() => {
          setIsCreateOpen(false)
          setFormError(null)
          setFieldErrors({})
          setSuccessMessage(null)
        }}
        onSubmit={handleCreate}
      />

      <FacilityDialog
        open={!!editTarget}
        mode="edit"
        facility={editTarget}
        isLoading={isWorking}
        formError={formError}
        fieldErrors={fieldErrors}
        onClose={() => {
          setEditTarget(null)
          setFormError(null)
          setFieldErrors({})
          setSuccessMessage(null)
        }}
        onSubmit={handleConfirmEdit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete facility?"
        description={
          confirmDelete
            ? `This will permanently remove ${confirmDelete.name || 'this facility'}.`
            : undefined
        }
        confirmLabel="Yes, delete"
        isLoading={isWorking}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmEdit}
        title="Edit facility?"
        description={
          confirmEdit
            ? `You are about to edit ${confirmEdit.name || 'this facility'}. Proceed?`
            : undefined
        }
        confirmLabel="Continue"
        isLoading={isWorking}
        onConfirm={() => {
          setEditTarget(confirmEdit)
          setConfirmEdit(null)
          setFormError(null)
          setFieldErrors({})
          setSuccessMessage(null)
        }}
        onCancel={() => setConfirmEdit(null)}
      />
    </div>
  )
}
