import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RecognitionPage from './pages/RecognitionPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUserPage from './pages/admin/AdminUserPage'
import AdminAttendanceLogsPage from './pages/admin/AdminAttendanceLogsPage'
import EmployeeDashboardPage from './pages/EmployeeDashboardPage'

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const location = useLocation()
  const token = localStorage.getItem('auth_token')

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return children
}

const App: React.FC = () => {
  const token = localStorage.getItem('auth_token')

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <EmployeeDashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/recognition"
        element={
          <RequireAuth>
            <RecognitionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboardPage />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/user" replace />} />
        <Route path="user" element={<AdminUserPage />} />
        <Route path="attendance-logs" element={<AdminAttendanceLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
