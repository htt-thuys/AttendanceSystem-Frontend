import React from 'react'

const Header: React.FC = () => {
  return (
    <header className="mb-3">
      <a
        href="https://enclave.vn"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
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
