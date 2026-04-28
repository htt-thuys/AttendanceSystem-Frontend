import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Header from '@/shared/components/common/Header'

const AdminDashboardPage: React.FC = () => {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 pb-2 text-sm font-semibold ${
      isActive
        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-300'
        : 'text-slate-500 dark:text-[rgba(170,184,214,0.7)]'
    }`

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(227,236,255,0.85),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(196,220,255,0.55),transparent_60%),linear-gradient(180deg,#f8fbff_0%,#e9f1ff_100%)] px-6 py-10 text-slate-900 dark:bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(88,112,156,0.6),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(70,108,150,0.5),transparent_60%),linear-gradient(180deg,#182235_0%,#141c2b_100%)] dark:text-[#d9e2f6]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Header />
        <header className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-semibold text-slate-900 dark:text-[#f6f8ff]">
                Attendance Recognition
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                Real-time facial detection and logging system.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
              Status: System Active
            </div>
          </div>
          <div className="h-px w-full bg-slate-200/70 dark:bg-[rgba(86,112,170,0.35)]" />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <NavLink to="/admin/user" className={tabClass}>
              User Directory
            </NavLink>
            <NavLink to="/admin/attendance-logs" className={tabClass}>
              Attendance Logs
            </NavLink>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export default AdminDashboardPage
