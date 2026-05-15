import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, MapPin, Users, Calendar } from 'lucide-react'
import { getEvent, getAttendanceStats, getAttendanceHistory, getEmployees } from '@/modules/event/services'
import type { EventItem, AttendanceStats, AttendanceRecord, Employee } from '@/modules/event/types'
import { EditEmployeesModal } from './AdminEventListPage'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function statusBadge(status: string | null): { label: string; class: string } {
  if (!status) return { label: 'Pending', class: 'bg-slate-200/70 text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.7)]' }
  if (status === 'present' || status === 'on_time') return { label: 'Present', class: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' }
  if (status === 'late') return { label: 'Late', class: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' }
  if (status === 'absent') return { label: 'Absent', class: 'bg-red-500/15 text-red-600 dark:text-red-300' }
  return { label: status, class: 'bg-slate-200/70 text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.7)]' }
}

const AdminEventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = React.useState<EventItem | null>(null)
  const [stats, setStats] = React.useState<AttendanceStats | null>(null)
  const [history, setHistory] = React.useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showEditModal, setShowEditModal] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const [ev, st, hist] = await Promise.all([
        getEvent(eventId),
        getAttendanceStats(eventId),
        getAttendanceHistory(eventId),
      ])
      setEvent(ev)
      setStats(st)
      setHistory(hist)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  React.useEffect(() => {
    fetchData()
    getEmployees()
      .then(setEmployees)
      .catch(() => {})
  }, [fetchData])

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
        <div className="py-16 text-center text-sm text-slate-400">Loading event...</div>
      </section>
    )
  }

  if (error || !event) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
        <div className="py-16 text-center text-sm text-red-600 dark:text-red-400">
          {error || 'Event not found.'}
        </div>
      </section>
    )
  }

  const checkInRate = stats && stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0

  const statCards = stats
    ? [
        {
          title: 'Total Assigned',
          value: String(stats.total),
          subtitle: 'Employees',
          accent: 'text-blue-600 dark:text-blue-300',
        },
        {
          title: 'Present',
          value: String(stats.present),
          subtitle: `${stats.not_checked_in} not checked in`,
          accent: 'text-emerald-600 dark:text-emerald-300',
        },
        {
          title: 'Check-in Rate',
          value: `${checkInRate}%`,
          subtitle: stats.late > 0 ? `${stats.late} late` : 'All on time',
          accent: 'text-amber-600 dark:text-amber-300',
        },
      ]
    : []

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          onClick={() => navigate('/admin/events')}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
        >
          <ChevronLeft size={16} />
          Back to Events
        </button>
        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)]"
        >
          <Users size={16} />
          Manage Employees
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Event Info Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.9)]">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-[rgba(255,255,255,0.1)] dark:text-[rgba(170,184,214,0.8)]">
                {event.event_code}
              </span>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-[#f6f8ff]">{event.title}</h3>
            </div>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold capitalize text-blue-600 dark:text-blue-300">
              {event.event_type}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-[rgba(170,184,214,0.8)]">
              <Calendar size={16} className="text-slate-400" />
              <div>
                <p>{formatDateTime(event.start_at)}</p>
                <p className="text-xs text-slate-400">to {formatDateTime(event.end_at)}</p>
              </div>
            </div>
            {event.room_id && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-[rgba(170,184,214,0.8)]">
                <MapPin size={16} className="text-slate-400" />
                <span>{event.room_id}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600 dark:text-[rgba(170,184,214,0.8)]">
              <Users size={16} className="text-slate-400" />
              <span>{event.total_employees} employees assigned</span>
            </div>
          </div>

          {/* Attendance Summary Card */}
          <div className="mt-5 border-t border-slate-200/70 pt-4 dark:border-[rgba(86,112,170,0.3)]">
            <h4 className="text-sm font-semibold text-slate-500 dark:text-[rgba(170,184,214,0.7)] mb-2">
              Attendance Summary
            </h4>
            {stats ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                  <p className="font-semibold text-emerald-600 dark:text-emerald-300">{stats.present}</p>
                  <p className="text-slate-500">Present</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                  <p className="font-semibold text-amber-600 dark:text-amber-300">{stats.late}</p>
                  <p className="text-slate-500">Late</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2 text-center">
                  <p className="font-semibold text-red-600 dark:text-red-300">{stats.absent}</p>
                  <p className="text-slate-500">Absent</p>
                </div>
                <div className="rounded-lg bg-slate-500/10 p-2 text-center">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">{stats.not_checked_in}</p>
                  <p className="text-slate-500">Pending</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No data yet.</p>
            )}
          </div>
        </div>

        {/* Right Column: Stats + History */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {statCards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.9)]"
                >
                  <p className="font-semibold text-slate-500 dark:text-[rgba(170,184,214,0.7)]">{card.title}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-[#f6f8ff]">{card.value}</p>
                  <p className={`mt-2 text-xs ${card.accent}`}>{card.subtitle}</p>
                </div>
              ))}
            </div>
          )}
          {statCards.length === 0 && (
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6 text-center text-sm text-slate-400 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.9)]">
              No attendance data available yet.
            </div>
          )}

          {/* Attendance History Table */}
          <div className="rounded-2xl border border-slate-200/70 dark:border-[rgba(86,112,170,0.35)]">
            <div className="bg-slate-50/90 px-6 py-4 text-sm font-semibold text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
              Attendance History
            </div>
            <div className="grid grid-cols-3 gap-4 bg-slate-50/90 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
              <span>Employee ID</span>
              <span>Check-in Time</span>
              <span className="text-right">Status</span>
            </div>
            {history.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-[rgba(170,184,214,0.6)]">
                No check-ins recorded yet.
              </div>
            ) : (
              history.map((rec) => {
                const sb = statusBadge(rec.status)
                return (
                  <div
                    key={rec.id}
                    className="grid grid-cols-3 items-center gap-4 border-t border-slate-200/70 bg-white/70 px-6 py-3 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
                  >
                    <span className="font-mono text-xs text-slate-900 dark:text-[#f6f8ff] truncate">
                      {rec.employee_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      <span>{formatTime(rec.check_in_at)}</span>
                    </div>
                    <span className="text-right">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${sb.class}`}>
                        {sb.label}
                      </span>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {showEditModal && event && (
        <EditEmployeesModal
          event={event}
          employees={employees}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); fetchData() }}
        />
      )}
    </section>
  )
}

export default AdminEventDetailPage
