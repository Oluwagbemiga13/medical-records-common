import React from 'react'
import type { Facility } from '../services/facilityService'

type Props = {
  facilities: Facility[]
  onEdit: (facility: Facility) => void
  onDelete: (facility: Facility) => void
}

export default function FacilitiesTable({ facilities, onEdit, onDelete }: Props) {
  if (facilities.length === 0) {
    return (
      <div className="table-empty">
        <h4>No facilities yet</h4>
        <p className="muted">Create a facility to get started.</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Country</th>
            <th>City</th>
            <th className="table-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((facility) => (
            <tr key={facility.id}>
              <td>{facility.name || '-'}</td>
              <td>{facility.code || '-'}</td>
              <td>{facility.country || '-'}</td>
              <td>{facility.city || '-'}</td>
              <td>
                <div className="table-action-buttons">
                  <button className="btn small inline" onClick={() => onEdit(facility)}>
                    Edit
                  </button>
                  <button className="btn small danger inline" onClick={() => onDelete(facility)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
