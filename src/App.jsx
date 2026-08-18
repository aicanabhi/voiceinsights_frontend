import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './context/AuthContext'
import AnalysisPage from './pages/AnalysisPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import MediaDetailPage from './pages/MediaDetailPage'
import MediaPage from './pages/MediaPage'
import OrganizationAgentsPage from './pages/OrganizationAgentsPage'
import OrganizationsPage from './pages/OrganizationsPage'
import TeamsPage from './pages/TeamsPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'

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
        {/* Every role has a dashboard of its own, so it makes a good home. */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        <Route
          path="/organizations"
          element={
            <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]}>
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />

        {/* Reading agents is super admin + that organization's org admin;
            writing is super admin only, enforced inside the page. */}
        <Route
          path="/organization-agents"
          element={
            <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]}>
              <OrganizationAgentsPage />
            </ProtectedRoute>
          }
        />

        {/* GET /teams/ 403s for an AGENT, so the route is gated to the roles
            that can actually list them. */}
        <Route
          path="/teams"
          element={
            <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.TEAM_LEAD]}>
              <TeamsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/users" element={<UsersPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/media/:id" element={<MediaDetailPage />} />

        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
