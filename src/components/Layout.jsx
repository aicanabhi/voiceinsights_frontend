import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { ROLES, useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">VI</span>
          <span>VoiceInsights</span>
        </div>

        <nav className="nav">
          {hasRole(ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN) && (
            <NavLink to="/organizations" className={navClass}>
              Organizations
            </NavLink>
          )}

          <NavLink to="/change-password" className={navClass}>
            Change password
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-email">{user?.email}</div>
            <span className="badge">{user?.role}</span>
          </div>

          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
