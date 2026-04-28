import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RecognitionPage from './pages/RecognitionPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUserPage from './pages/admin/AdminUserPage'
import AdminAttendanceLogsPage from './pages/admin/AdminAttendanceLogsPage'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/recognition" element={<RecognitionPage />} />
      <Route path="/admin" element={<AdminDashboardPage />}>
        <Route index element={<Navigate to="/admin/user" replace />} />
        <Route path="user" element={<AdminUserPage />} />
        <Route path="attendance-logs" element={<AdminAttendanceLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
