import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

/**
 * Gate for authenticated routes. `roles` mirrors the backend's require_roles --
 * hiding a route the API would reject anyway, so the user gets a clear message
 * instead of a 403 toast.
 */
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="empty-state">
        <h2>Not allowed</h2>
        <p>
          Your role (<strong>{user.role}</strong>) does not have access to this
          page.
        </p>
      </div>
    )
  }

  return children
}
