import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const MenuButton: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = React.useState(false)
  const role = (localStorage.getItem('auth_role') || '').toLowerCase()
  const isSuperAdmin = role === 'superadmin'
  const canAccessAdmin = isSuperAdmin
  const canAccessCamera = role === 'manager' || role === 'superadmin'
  const canAccessEmployee = role === 'manager' || role === 'superadmin'
  const isOnEmployee = location.pathname.startsWith('/dashboard')
  const isOnRecognition = location.pathname.startsWith('/recognition')
  const isOnAdmin = location.pathname.startsWith('/admin')

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_role')
    setIsOpen(false)
    navigate('/')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.75)]"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-slate-200/70 bg-white/95 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(16,24,44,0.98)]">
          {canAccessEmployee && (
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard')}
              disabled={isOnEmployee}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                isOnEmployee
                  ? 'cursor-not-allowed text-slate-400 dark:text-[rgba(170,184,214,0.45)]'
                  : 'text-slate-600 hover:bg-slate-100/80 dark:text-[rgba(170,184,214,0.85)] dark:hover:bg-[rgba(40,52,86,0.6)]'
              }`}
            >
              Employee
            </button>
          )}
          {canAccessCamera && (
            <button
              type="button"
              onClick={() => handleNavigate('/recognition')}
              disabled={isOnRecognition}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                isOnRecognition
                  ? 'cursor-not-allowed text-slate-400 dark:text-[rgba(170,184,214,0.45)]'
                  : 'text-slate-600 hover:bg-slate-100/80 dark:text-[rgba(170,184,214,0.85)] dark:hover:bg-[rgba(40,52,86,0.6)]'
              }`}
            >
              Camera
            </button>
          )}
          {canAccessAdmin && (
            <button
              type="button"
              onClick={() => handleNavigate('/admin')}
              disabled={isOnAdmin}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                isOnAdmin
                  ? 'cursor-not-allowed text-slate-400 dark:text-[rgba(170,184,214,0.45)]'
                  : 'text-slate-600 hover:bg-slate-100/80 dark:text-[rgba(170,184,214,0.85)] dark:hover:bg-[rgba(40,52,86,0.6)]'
              }`}
            >
              Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuButton
