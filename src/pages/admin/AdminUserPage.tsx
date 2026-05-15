import React from 'react'
import { getEmployees } from '@/modules/event/services'
import type { Employee } from '@/modules/event/types'

const AdminUserPage: React.FC = () => {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load employees'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-[#f6f8ff]">User Directory</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
            Manage employee profiles and facial recognition data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(18,26,46,0.9)] dark:text-[rgba(170,184,214,0.8)] dark:placeholder:text-[rgba(170,184,214,0.5)]"
          />
          <button className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)]">
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-[rgba(86,112,170,0.4)]">
        <div className="grid grid-cols-5 gap-4 bg-slate-50/90 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
          <span className="col-span-2">Employee</span>
          <span>ID</span>
          <span>Department</span>
          <span className="text-right">Status</span>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading employees...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            {search ? 'No employees match your search.' : 'No employees found.'}
          </div>
        ) : (
          filtered.map((employee) => (
            <div
              key={employee.id}
              className="grid grid-cols-5 items-center gap-4 border-t border-slate-200/70 bg-white/70 px-6 py-4 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
            >
              <div className="col-span-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70 text-sm font-semibold text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.7)]">
                  {employee.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{employee.full_name}</p>
                  <p className="text-xs text-slate-400">{employee.email}</p>
                </div>
              </div>
              <span className="font-mono text-xs">{employee.employee_code}</span>
              <span>{employee.position || '—'}</span>
              <span className="text-right">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    employee.is_active
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : 'bg-slate-200/70 text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.7)]'
                  }`}
                >
                  {employee.is_active ? 'Active' : 'Inactive'}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default AdminUserPage
