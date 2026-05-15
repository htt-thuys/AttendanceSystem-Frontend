import React from 'react'
import Header from '@/shared/components/common/Header'
import { getEmployees, getEmployeeAttendanceHistory } from '@/modules/event/services'
import type { Employee, AttendanceRecord } from '@/modules/event/types'

const EmployeeDashboardPage: React.FC = () => {
  const employeeName = localStorage.getItem('full_name') || 'Employee'
  const [now, setNow] = React.useState(() => new Date())
  const [attendanceLogs, setAttendanceLogs] = React.useState<AttendanceRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)

    getEmployees()
      .then((emps) => {
        if (cancelled) return
        const matched = emps.find((e) => e.full_name === employeeName)
        if (matched) {
          return getEmployeeAttendanceHistory(matched.id)
        }
        return [] as AttendanceRecord[]
      })
      .then((records) => {
        if (cancelled) return
        setAttendanceLogs(records ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load attendance data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [employeeName])

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const localDate = new Intl.DateTimeFormat('en-US', {
    timeZone: localTimeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now)
  const localTime = new Intl.DateTimeFormat('en-US', {
    timeZone: localTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
  const offsetMinutes = -now.getTimezoneOffset()
  const offsetSign = offsetMinutes >= 0 ? '+' : '-'
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
  const offsetRemainder = Math.abs(offsetMinutes) % 60
  const utcOffset = `UTC${offsetSign}${String(offsetHours).padStart(2, '0')}${offsetRemainder ? `:${String(offsetRemainder).padStart(2, '0')}` : ''}`

  const eventIds = new Set(attendanceLogs.map((l) => l.event_id).filter(Boolean))
  const eventsAttended = eventIds.size
  const presentCount = attendanceLogs.filter((l) => l.status === 'present').length
  const onTimeRate = attendanceLogs.length > 0 ? Math.round((presentCount / attendanceLogs.length) * 100) : 0

  const attendanceCards = [
    {
      title: 'Today',
      date: localDate,
      time: localTime,
      meta: utcOffset,
      accent: 'bg-sky-500/10 text-sky-500',
    },
    {
      title: 'Events Attended',
      value: loading ? '...' : String(eventsAttended),
      date: null,
      time: null,
      meta: 'Total events',
      accent: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      title: 'On-time Rate',
      value: loading ? '...' : `${onTimeRate}%`,
      date: null,
      time: null,
      meta: `${presentCount} / ${attendanceLogs.length} check-ins`,
      accent: 'bg-amber-500/10 text-amber-500',
    },
  ]

  const formatDateTime = (iso: string | null) => {
    if (!iso) return { date: '—', time: '—' }
    const d = new Date(iso)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz }),
      time: d
        .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz })
        .replace(':00 ', ' '),
    }
  }

  const statusLabel = (status: string | null): string => {
    if (!status) return 'Unknown'
    const map: Record<string, string> = { present: 'On Time', late: 'Late', absent: 'Absent', not_checked_in: 'N/A' }
    return map[status] ?? status
  }

  const statusTone = (status: string | null): string => {
    if (status === 'present') return 'bg-emerald-500/15 text-emerald-500'
    if (status === 'late') return 'bg-amber-500/15 text-amber-500'
    return 'bg-rose-500/15 text-rose-500'
  }

  const announcements = [
    {
      title: 'Upcoming Public Holiday',
      time: 'Today, 09:00 AM',
      detail: 'The office will be closed on Friday for National Day.',
      tone: 'text-sky-500 bg-sky-500/10',
    },
    {
      title: 'Face Data Update Required',
      time: 'Yesterday, 02:30 PM',
      detail: 'Please visit HR to update your facial recognition data.',
      tone: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Network Maintenance Window',
      time: 'Yesterday, 08:00 PM',
      detail: 'Wi-Fi will be unstable during the 10 PM to 11 PM update.',
      tone: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      title: 'Payroll Cutoff Reminder',
      time: 'Oct 21, 2024',
      detail: 'Submit reimbursements by 5 PM to be included this cycle.',
      tone: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'Security Training Due',
      time: 'Oct 20, 2024',
      detail: 'Complete the 20-minute module before Friday.',
      tone: 'text-rose-500 bg-rose-500/10',
    },
  ]

  const [isAnnouncementOpen, setIsAnnouncementOpen] = React.useState(false)
  const [showAllAnnouncements, setShowAllAnnouncements] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(attendanceLogs.length / pageSize))
  const pagedLogs = attendanceLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const visibleAnnouncements = showAllAnnouncements ? announcements : announcements.slice(0, 3)

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(227,236,255,0.85),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(196,220,255,0.55),transparent_60%),linear-gradient(180deg,#f8fbff_0%,#e9f1ff_100%)] px-6 py-10 text-slate-900 dark:bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(88,112,156,0.6),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(70,108,150,0.5),transparent_60%),linear-gradient(180deg,#182235_0%,#141c2b_100%)] dark:text-[#d9e2f6]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Header />
        <section className="relative z-10 rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-[rgba(86,112,170,0.45)] dark:bg-[rgba(19,27,45,0.92)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-[rgba(170,184,214,0.6)]">
                Welcome back
              </p>
              <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold text-slate-900 dark:text-[#f6f8ff]">
                {employeeName}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                Here is your attendance summary and recent updates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementOpen((prev) => !prev)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.75)]"
                  aria-label="Toggle announcements"
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
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                  </svg>
                  <span className="absolute -right-1 -top-1 h-5 min-w-[20px] rounded-full bg-blue-500 px-1 text-[11px] font-semibold leading-5 text-white">
                    {announcements.length}
                  </span>
                </button>

                {isAnnouncementOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[320px] rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(16,24,44,0.98)]">
                    <div
                      className={
                        showAllAnnouncements
                          ? 'scrollbar-elegant max-h-[360px] space-y-4 overflow-y-auto pr-1'
                          : 'space-y-4'
                      }
                    >
                      {visibleAnnouncements.map((item) => (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.9)] dark:text-[rgba(170,184,214,0.75)]"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-8 w-8 rounded-full text-center text-xs font-semibold leading-8 ${item.tone}`}
                            >
                              i
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-[#f6f8ff]">
                                {item.title}
                              </p>
                              <p className="mt-2 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.75)]">
                                {item.detail}
                              </p>
                              <p className="mt-3 text-xs text-slate-400 dark:text-[rgba(170,184,214,0.55)]">
                                {item.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {announcements.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllAnnouncements((prev) => !prev)}
                        className="mt-4 w-full rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm transition hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                      >
                        {showAllAnnouncements ? 'See Less' : 'See More'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                Checked In (08:50 AM)
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4">
          <section className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {attendanceCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(20,28,52,0.92)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                      {card.title}
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${card.accent}`}>
                      {card.meta}
                    </span>
                  </div>
                  <div className="mt-4 flex h-[60px] flex-col justify-end">
                    {card.date && card.time ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                          {card.date}
                        </p>
                        <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-[#f6f8ff]">
                          {card.time}
                        </p>
                      </>
                    ) : (
                      <p className="text-3xl font-semibold text-slate-900 dark:text-[#f6f8ff]">
                        {card.value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200/70 bg-white/75 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(20,28,52,0.92)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-[#f6f8ff]">My Attendance Log</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                    Track your recent check-ins, hours, and attendance status.
                  </p>
                </div>
                <button className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm transition hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]">
                  View All
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-[rgba(86,112,170,0.35)]">
                <div className="grid grid-cols-4 gap-4 bg-slate-50/90 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
                  <span>Date</span>
                  <span>Check In</span>
                  <span>Event</span>
                  <span>Status</span>
                </div>
                {loading ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-400">Loading attendance records...</div>
                ) : pagedLogs.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-400">No attendance records found.</div>
                ) : (
                  pagedLogs.map((log) => {
                    const { date, time } = formatDateTime(log.check_in_at)
                    return (
                      <div
                        key={log.id}
                        className="grid grid-cols-4 items-center gap-4 border-t border-slate-200/70 bg-white/70 px-6 py-4 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
                      >
                        <span className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{date}</span>
                        <span>{time}</span>
                        <span className="text-xs text-slate-400">{log.event_id}</span>
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusTone(log.status)}`}>
                          {statusLabel(log.status)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 font-semibold text-slate-500 shadow-sm transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 font-semibold text-slate-500 shadow-sm transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </section>

        </div>
      </div>
    </main>
  )
}

export default EmployeeDashboardPage
