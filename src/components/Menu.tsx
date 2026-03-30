import React from 'react'

export type MenuItem = {
  label: string
  onClick?: () => void
}

type Props = {
  title: string
  subtitle: string
  menuItems: MenuItem[]
  onLogout: () => void
}

export default function Menu({ title, subtitle, menuItems, onLogout }: Props) {
  return (
    <div className="card-panel">
      <div className="card-header">
        <div className="avatar-chip">A</div>
        <div style={{ marginLeft: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            {subtitle}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }} className="menu-grid">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className="menu-btn"
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
        <button className="menu-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  )
}
