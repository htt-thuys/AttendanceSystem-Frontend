import React from 'react'
import { useNavigate } from 'react-router-dom'
import LogoutButton from './LogoutButton'
import MenuButton from './MenuButton'
import logo from '../assets/LogoEnclave.png'

const Header: React.FC = () => {
  const navigate = useNavigate()

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    navigate(token ? '/dashboard' : '/')
  }

  const token = localStorage.getItem('auth_token')
  const role = (localStorage.getItem('auth_role') || '').toLowerCase()
  const isEmployee = role === 'employee'

  return (
    <header className="mb-3 flex items-center justify-between">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        onClick={handleLogoClick}
      >
        <img
          src="logo"
          alt="Logo"
          className="w-[140px] h-auto cursor-pointer transition-opacity hover:opacity-80 dark:brightness-110 dark:contrast-125"
        />
      </a>

      {token && (isEmployee ? <LogoutButton /> : <MenuButton />)}
    </header>
  )
}

export default Header
