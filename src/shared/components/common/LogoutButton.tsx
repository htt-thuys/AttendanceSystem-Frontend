import React from 'react'
import { useNavigate } from 'react-router-dom'

const LogoutButton: React.FC = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_role')
    navigate('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-600 transition hover:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
      aria-label="Logout"
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
        <path d="M9 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
        <path d="M16 12H9" />
        <path d="M16 12l-3-3" />
        <path d="M16 12l-3 3" />
        <path d="M21 12h-5" />
      </svg>
    </button>
  )
}

export default LogoutButton
