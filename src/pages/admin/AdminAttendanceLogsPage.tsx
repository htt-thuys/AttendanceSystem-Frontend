import React from 'react'
import { getEmployees, getAllAttendanceHistory } from '@/modules/event/services'
import type { Employee, AttendanceRecord } from '@/modules/event/types'

const AdminAttendanceLogsPage: React.FC = () => {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [logs, setLogs] = React.useState<AttendanceRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    Promise.all([getEmployees(), getAllAttendanceHistory(500)])
      .then(([emps, records]) => {
        setEmployees(emps)
        setLogs(records)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load attendance logs'))
      .finally(() => setLoading(false))
  }, [])

  const employeeMap = React.useMemo(() => {
    const map = new Map<string, Employee>()
    for (const e of employees) map.set(e.id, e)
    return map
  }, [employees])

  const totalCheckIns = logs.length
  const presentCount = logs.filter((l) => l.status === 'present').length
  const successRate = totalCheckIns > 0 ? ((presentCount / totalCheckIns) * 100).toFixed(1) : '0.0'
  const reviewCount = logs.filter((l) => l.status !== 'present' || !l.status).length

  const formatTime = (iso: string | null): string => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d
      .toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .replace(':00 ', ' ')
  }

  const formatDate = (iso: string | null): string => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }

  const statusLabel = (status: string | null): string => {
    if (!status) return 'Unknown'
    const map: Record<string, string> = {
      present: 'Success',
      late: 'Late',
      absent: 'Absent',
      not_checked_in: 'Not Checked In',
    }
    return map[status] ?? status
  }

  const statusStyle = (status: string | null): string => {
    if (status === 'present')
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
    if (status === 'late')
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
  }

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

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { title: 'Total Check-ins', value: totalCheckIns.toLocaleString(), trend: loading ? 'Loading...' : 'All records' },
          { title: 'Success Rate', value: `${successRate}%`, trend: `${presentCount} present out of ${totalCheckIns}` },
          { title: 'Needs Review', value: `${reviewCount}`, trend: 'Requires manual review' },
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
          <span className="text-right">Note</span>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading attendance logs...</div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">No attendance records found.</div>
        ) : (
          logs.map((log) => {
            const emp = employeeMap.get(log.employee_id)
            return (
              <div
                key={log.id}
                className="grid grid-cols-5 items-center gap-4 border-t border-slate-200/70 bg-white/70 px-6 py-4 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{formatTime(log.check_in_at)}</p>
                  <p className="text-xs text-slate-400">{formatDate(log.check_in_at)}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-[#f6f8ff]">
                    {emp?.full_name ?? log.employee_id}
                  </p>
                  <p className="text-xs text-slate-400">{emp?.employee_code ?? ''}</p>
                </div>
                <span>{emp?.position || '—'}</span>
                <span>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(log.status)}`}
                  >
                    {statusLabel(log.status)}
                  </span>
                </span>
                <span className="text-right text-xs text-slate-400">{log.note || '—'}</span>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export default AdminAttendanceLogsPage
