import React from 'react'

const AdminUserPage: React.FC = () => {
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
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(18,26,46,0.9)] dark:text-[rgba(170,184,214,0.8)]">
            <span className="text-slate-400">Search users...</span>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)]">
            Add User
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-[rgba(86,112,170,0.4)]">
        <div className="grid grid-cols-6 gap-4 bg-slate-50/90 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
          <span className="col-span-2">Employee</span>
          <span>ID</span>
          <span>Department</span>
          <span>Photos</span>
          <span className="text-right">Status</span>
        </div>
        {[
          {
            name: 'Eleanor Vance',
            id: 'EMP-001',
            dept: 'Engineering',
            photos: '1/5',
            status: 'Active',
          },
          {
            name: 'Theo Crain',
            id: 'EMP-002',
            dept: 'Marketing',
            photos: '2/5',
            status: 'Active',
          },
          {
            name: 'Shirley Crain',
            id: 'EMP-003',
            dept: 'HR',
            photos: '0/5',
            status: 'Inactive',
          },
        ].map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-6 items-center gap-4 border-t border-slate-200/70 bg-white/70 px-6 py-4 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
          >
            <div className="col-span-2 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200/70 dark:bg-[rgba(255,255,255,0.08)]" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{row.name}</p>
                <p className="text-xs text-slate-400">{row.id}</p>
              </div>
            </div>
            <span>{row.id}</span>
            <span>{row.dept}</span>
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.8)]">
              {row.photos}
            </span>
            <span className="text-right">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  row.status === 'Active'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                    : 'bg-slate-200/70 text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.7)]'
                }`}
              >
                {row.status}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AdminUserPage
