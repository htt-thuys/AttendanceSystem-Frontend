import React from 'react'
import { useNavigate } from 'react-router-dom'

const Header: React.FC = () => {
  const navigate = useNavigate()

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const token = localStorage.getItem('auth_token')
    navigate(token ? '/recognition' : '/')
  }

  return (
    <header className="mb-3">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        onClick={handleLogoClick}
      >
        <img
          src="/src/assets/LogoEnclave.png"
          alt="Logo"
          className="w-[140px] h-auto cursor-pointer transition-opacity hover:opacity-80 dark:brightness-110 dark:contrast-125"
        />
      </a>
    </header>
  )
}

export default Header
