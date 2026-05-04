import React from 'react'
import type { Patient } from '../services/patientService'

type Props = {
  patients: Patient[]
  onEdit: (patient: Patient) => void
  onDelete?: (patient: Patient) => void
}

export default function PatientsTable({ patients, onEdit, onDelete }: Props) {
  if (patients.length === 0) {
    return (
      <div className="table-empty">
        <h4>No patients yet</h4>
        <p className="muted">Add a patient to get started.</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Health Care #</th>
            <th>Date of Birth</th>
            <th>Sex</th>
            <th>Phone</th>
            <th className="table-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id}>
              <td>
                {[p.demographics?.givenName, p.demographics?.familyName].filter(Boolean).join(' ') || '—'}
              </td>
              <td>{p.demographics?.healthCareNumber || '—'}</td>
              <td>{p.demographics?.dateOfBirth || '—'}</td>
              <td>{p.demographics?.sex || '—'}</td>
              <td>{p.demographics?.phone || '—'}</td>
              <td>
                <div className="table-action-buttons">
                  <button className="btn small inline" onClick={() => onEdit(p)}>
                    Edit
                  </button>
                  {onDelete && (
                    <button className="btn small danger inline" onClick={() => onDelete(p)}>
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
