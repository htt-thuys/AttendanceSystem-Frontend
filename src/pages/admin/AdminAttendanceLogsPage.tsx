import React from 'react'

const AdminAttendanceLogsPage: React.FC = () => {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-[#f6f8ff]">Attendance Logs</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
            Review and export daily check-in statistics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(18,26,46,0.9)] dark:text-[rgba(170,184,214,0.8)]">
            Today
          </button>
          <button className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-500 shadow-sm dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(18,26,46,0.9)] dark:text-[rgba(170,184,214,0.8)]">
            Filter
          </button>
          <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(16,185,129,0.35)]">
            Export Excel
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { title: 'Total Check-ins', value: '1,284', trend: '+12% from yesterday' },
          { title: 'Success Rate', value: '98.5%', trend: 'Average confidence: 97.2%' },
          { title: 'Failed Detections', value: '18', trend: 'Requires manual review' },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.9)] dark:text-[rgba(170,184,214,0.7)]"
          >
            <p className="font-semibold text-slate-500 dark:text-[rgba(170,184,214,0.7)]">{card.title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-[#f6f8ff]">{card.value}</p>
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-300">{card.trend}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-[rgba(86,112,170,0.4)]">
        <div className="grid grid-cols-5 gap-4 bg-slate-50/90 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
          <span>Time</span>
          <span>Employee</span>
          <span>Department</span>
          <span>Status</span>
          <span className="text-right">AI Confidence</span>
        </div>
        {[
          { time: '08:15 AM', date: 'Oct 24, 2024', name: 'Eleanor Vance', dept: 'Engineering', status: 'Success', score: '99.8%' },
          { time: '08:42 AM', date: 'Oct 24, 2024', name: 'Theo Crain', dept: 'Marketing', status: 'Success', score: '97.4%' },
          { time: '09:01 AM', date: 'Oct 24, 2024', name: 'Shirley Crain', dept: 'HR', status: 'Needs Review', score: '86.2%' },
        ].map((log) => (
          <div
            key={log.time}
            className="grid grid-cols-5 items-center gap-4 border-t border-slate-200/70 bg-white/70 px-6 py-4 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{log.time}</p>
              <p className="text-xs text-slate-400">{log.date}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{log.name}</p>
              <p className="text-xs text-slate-400">EMP-00X</p>
            </div>
            <span>{log.dept}</span>
            <span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  log.status === 'Success'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                }`}
              >
                {log.status}
              </span>
            </span>
            <span className="text-right font-semibold text-emerald-600 dark:text-emerald-300">{log.score}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AdminAttendanceLogsPage
