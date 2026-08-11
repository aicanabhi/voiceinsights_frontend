import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './context/AuthContext'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import OrganizationsPage from './pages/OrganizationsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/organizations" replace />} />

        <Route
          path="/organizations"
          element={
            <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]}>
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
