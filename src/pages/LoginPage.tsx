import React from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/LogoEnclave.png'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      username: String(formData.get('username') || ''),
      password: String(formData.get('password') || ''),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        setErrorMessage('Login failed. Please check your credentials.')
        return
      }

      const data = (await response.json()) as {
        success?: boolean
        message?: string
        token?: string
        role?: string
        full_name?: string
        username?: string
      }
      if (data.success) {
        if (data.token) {
          localStorage.setItem('auth_token', data.token)
        }
        if (data.role) {
          localStorage.setItem('auth_role', data.role)
        }
        if (data.full_name) {
          localStorage.setItem('full_name', data.full_name)
        }
        if (data.username) {
          localStorage.setItem('auth_username', data.username)
        }
        navigate('/dashboard')
        return
      }

      setErrorMessage(data.message || 'Invalid username or password.')
    } catch {
      setErrorMessage('Unable to connect to the database!')
    }
  }

  return (
    <main
      className="relative min-h-[100svh] w-full overflow-hidden bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(227,236,255,0.85),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(196,220,255,0.55),transparent_60%),linear-gradient(180deg,#f8fbff_0%,#e9f1ff_100%)] text-slate-900 antialiased font-[Figtree] dark:bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(88,112,156,0.6),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(70,108,150,0.5),transparent_60%),linear-gradient(180deg,#182235_0%,#141c2b_100%)] dark:text-[#d9e2f6] flex items-center justify-center px-4"
    >
      <div
        className="pointer-events-none absolute -top-[20%] left-1/2 h-[70%] w-[120%] -translate-x-1/2 rounded-[40%] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(79,126,255,0.22),transparent_60%),radial-gradient(40%_40%_at_80%_10%,rgba(126,208,255,0.18),transparent_60%),radial-gradient(40%_40%_at_50%_80%,rgba(120,120,255,0.12),transparent_70%)] blur-xl opacity-80 dark:bg-[radial-gradient(60%_60%_at_20%_20%,rgba(70,120,255,0.3),transparent_60%),radial-gradient(40%_40%_at_80%_10%,rgba(60,200,255,0.24),transparent_60%),radial-gradient(40%_40%_at_50%_80%,rgba(140,120,255,0.16),transparent_70%)] dark:opacity-95"
        aria-hidden="true"
      />

      <section
        className="relative z-10 w-[min(440px,92vw)] rounded-[18px] border border-slate-200/80 bg-white/80 px-8 pb-6 pt-8 shadow-[0_24px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)] dark:shadow-[0_26px_52px_rgba(6,12,26,0.5)]"
        aria-label="VisionaryAI login"
      >
        <div className="mb-6 text-center">
          <div>
            <img
              src={logo}
              alt="Logo"
              className="mx-auto mb-3 w-[140px] h-auto cursor-pointer transition-opacity hover:opacity-80"
            />
            <h1 className="font-['Space_Grotesk'] text-[26px] font-semibold tracking-[-0.4px] text-slate-900 dark:text-[#f6f8ff]">
              Attendance System Login
            </h1>
            <p className="mt-1 inline-flex items-center justify-center gap-2 text-[14px] tracking-[0.4px] text-slate-500 dark:text-[#aab6d2]">
              Internal System Access
            </p>
          </div>
        </div>

        <form className="grid gap-4" autoComplete="on" method="post" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-[14px] text-slate-500 dark:text-[#aab6d2]">
            <span>Username</span>
            <div className="flex items-center gap-2 rounded-[12px] border border-transparent bg-slate-100/80 px-3 py-3 transition focus-within:border-blue-400/70 focus-within:shadow-[0_0_0_3px_rgba(96,165,250,0.25)] dark:bg-[rgba(8,12,24,0.9)] dark:focus-within:border-[rgba(110,162,255,0.6)] dark:focus-within:shadow-[0_0_0_3px_rgba(110,162,255,0.15)]">
              <input
                className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-[#d9e2f6] dark:placeholder:text-[rgba(185,198,220,0.55)]"
                type="text"
                name="username"
                placeholder="Example: AdminEnclave"
                autoComplete="username"
              />
            </div>
          </label>

          <label className="grid gap-2 text-[14px] text-slate-500 dark:text-[#aab6d2]">
            <span>Password</span>
            <div className="flex items-center gap-2 rounded-[12px] border border-transparent bg-slate-100/80 px-3 py-3 transition focus-within:border-blue-400/70 focus-within:shadow-[0_0_0_3px_rgba(96,165,250,0.25)] dark:bg-[rgba(8,12,24,0.9)] dark:focus-within:border-[rgba(110,162,255,0.6)] dark:focus-within:shadow-[0_0_0_3px_rgba(110,162,255,0.15)]">
              <input
                className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-[#d9e2f6] dark:placeholder:text-[rgba(185,198,220,0.55)]"
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </label>

          <button
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(90deg,#3b82f6,#2563eb)] px-4 py-3 text-[15px] font-semibold tracking-[0.2px] text-white shadow-[0_12px_24px_rgba(59,130,246,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(37,99,235,0.35)] dark:bg-[linear-gradient(90deg,#2a6df6,#1b4ddf)] dark:shadow-[0_12px_24px_rgba(21,72,210,0.35)] dark:hover:shadow-[0_16px_28px_rgba(21,72,210,0.4)]"
            type="submit"
          >
            Authenticate
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {errorMessage && (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        <p className="mt-5 border-t border-slate-200/80 pt-4 text-center text-[12.5px] text-slate-500 dark:border-[rgba(62,82,125,0.45)] dark:text-[rgba(170,184,214,0.7)]">
          Authorized personnel only. Contact IT for access issues.
        </p>
      </section>

    </main>
  )
}

export default LoginPage
