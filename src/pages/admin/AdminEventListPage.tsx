import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Users, X, Calendar, Clock } from 'lucide-react'
import { getEvents, createEvent, updateEventEmployees, getEmployees } from '@/modules/event/services'
import type { EventItem, CreateEventPayload, Employee } from '@/modules/event/types'

const PAGE_SIZE = 10

const EVENT_TYPES = ['meeting', 'workshop', 'conference', 'training', 'other'] as const

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

function getEventStatus(event: EventItem): { label: string; class: string } {
  const now = Date.now()
  const start = new Date(event.start_at).getTime()
  const end = new Date(event.end_at).getTime()
  if (now < start) return { label: 'Upcoming', class: 'bg-sky-500/15 text-sky-600 dark:text-sky-300' }
  if (now > end) return { label: 'Ended', class: 'bg-slate-200/70 text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.7)]' }
  return { label: 'Active', class: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' }
}

// ─── Edit Employees Modal ──────────────────────────────

export const EditEmployeesModal: React.FC<{
  event: EventItem
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}> = ({ event, employees, onClose, onSaved }) => {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateEventEmployees(event.id, { employee_ids: [...selected] })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update employees')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-[rgba(86,112,170,0.45)] dark:bg-[rgba(18,26,46,0.98)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f6f8ff]">
            Manage Employees
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)] mb-4">
          {event.title} — {event.event_code}
        </p>

        <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-elegant">
          {employees.map((emp) => (
            <label
              key={emp.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-[rgba(40,52,86,0.4)]"
            >
              <input
                type="checkbox"
                checked={selected.has(emp.id)}
                onChange={() => toggle(emp.id)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-[#f6f8ff]">{emp.full_name}</p>
                <p className="text-xs text-slate-400">{emp.employee_code} · {emp.position}</p>
              </div>
            </label>
          ))}
          {employees.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No employees found.</p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Event Modal ────────────────────────────────

const CreateEventModal: React.FC<{
  employees: Employee[]
  onClose: () => void
  onCreated: () => void
}> = ({ employees, onClose, onCreated }) => {
  const [form, setForm] = React.useState({
    event_code: '',
    title: '',
    event_type: 'meeting' as string,
    start_at: '',
    end_at: '',
    room_id: '',
    employee_ids: [] as string[],
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [employeeSearch, setEmployeeSearch] = React.useState('')

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.position.toLowerCase().includes(employeeSearch.toLowerCase()),
  )

  const toggleEmployee = (id: string) => {
    setForm((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter((eid) => eid !== id)
        : [...prev.employee_ids, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.event_code || !form.title || !form.start_at || !form.end_at) {
      setError('Please fill all required fields.')
      return
    }
    if (new Date(form.end_at) <= new Date(form.start_at)) {
      setError('End time must be after start time.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: CreateEventPayload = {
        ...form,
        room_id: form.room_id || null,
      }
      await createEvent(payload)
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-elegant rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-[rgba(86,112,170,0.45)] dark:bg-[rgba(18,26,46,0.98)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f6f8ff]">Create Event</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">Event Code *</span>
              <input
                value={form.event_code}
                onChange={(e) => setForm((p) => ({ ...p, event_code: e.target.value }))}
                placeholder="EVT-001"
                className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/70 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.25)] dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[#d9e2f6]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">Event Type *</span>
              <select
                value={form.event_type}
                onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
                className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/70 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[#d9e2f6]"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">Title *</span>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Team Meeting"
              className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/70 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.25)] dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[#d9e2f6]"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">Start At *</span>
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))}
                className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/70 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[#d9e2f6] [color-scheme:dark]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">End At *</span>
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))}
                className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/70 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[#d9e2f6] [color-scheme:dark]"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">Room (optional)</span>
            <input
              value={form.room_id}
              onChange={(e) => setForm((p) => ({ ...p, room_id: e.target.value }))}
              placeholder="Room A-101"
              className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400/70 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[#d9e2f6]"
            />
          </label>

          <div className="grid gap-1">
            <span className="text-sm font-medium text-slate-600 dark:text-[rgba(170,184,214,0.8)]">
              Assign Employees ({form.employee_ids.length} selected)
            </span>
            <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)]">
              <input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employees..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-[#d9e2f6]"
              />
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto scrollbar-elegant">
              {filteredEmployees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-[rgba(40,52,86,0.4)]"
                >
                  <input
                    type="checkbox"
                    checked={form.employee_ids.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-[rgba(170,184,214,0.85)]">
                    {emp.full_name} <span className="text-xs text-slate-400">— {emp.employee_code}</span>
                  </span>
                </label>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-400">No employees found.</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)] disabled:opacity-60"
            >
              <Plus size={16} />
              {saving ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Event List Page ───────────────────────────────────

const AdminEventListPage: React.FC = () => {
  const navigate = useNavigate()
  const [events, setEvents] = React.useState<EventItem[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [showCreate, setShowCreate] = React.useState(false)
  const [editEvent, setEditEvent] = React.useState<EventItem | null>(null)

  const fetchEvents = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEvents()
      setEvents(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchEvents()
    getEmployees()
      .then(setEmployees)
      .catch(() => {})
  }, [fetchEvents])

  const filtered = events.filter(
    (ev) =>
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.event_code.toLowerCase().includes(search.toLowerCase()),
  )

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-[#f6f8ff]">Event Management</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
            Create and manage events, assign employees, and track attendance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(18,26,46,0.9)] dark:text-[rgba(170,184,214,0.8)]">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search events..."
              className="bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-[rgba(170,184,214,0.6)]"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.35)]"
          >
            <Plus size={16} />
            Create Event
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-8 py-16 text-center text-sm text-slate-400">Loading events...</div>
      )}
      {!loading && error && (
        <div className="mt-8 py-16 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="mt-8 py-16 text-center">
          <Calendar size={48} className="mx-auto mb-3 text-slate-300 dark:text-[rgba(170,184,214,0.3)]" />
          <p className="text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
            {search ? 'No events match your search.' : 'No events yet. Create your first event!'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-[rgba(86,112,170,0.4)]">
            <div className="grid grid-cols-7 gap-2 bg-slate-50/90 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.7)]">
              <span>Code</span>
              <span className="col-span-2">Title</span>
              <span>Type</span>
              <span>Time</span>
              <span className="text-center">Employees</span>
              <span className="text-right">Actions</span>
            </div>
            {paged.map((ev) => {
              const status = getEventStatus(ev)
              return (
                <div
                  key={ev.id}
                  className="grid grid-cols-7 items-center gap-2 border-t border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600 dark:border-[rgba(86,112,170,0.35)] dark:bg-[rgba(20,28,52,0.92)] dark:text-[rgba(170,184,214,0.8)]"
                >
                  <span className="font-semibold text-slate-900 dark:text-[#f6f8ff]">{ev.event_code}</span>
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900 dark:text-[#f6f8ff] truncate">{ev.title}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  <span className="capitalize text-xs">{ev.event_type}</span>
                  <div className="text-xs leading-relaxed">
                    <p className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDateTime(ev.start_at)}
                    </p>
                    <p className="flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      {formatDateTime(ev.end_at)}
                    </p>
                  </div>
                  <span className="text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(170,184,214,0.8)]">
                      <Users size={12} />
                      {ev.total_employees}
                    </span>
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/admin/events/${ev.id}`)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      onClick={() => setEditEvent(ev)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                    >
                      <Users size={14} />
                      Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 font-semibold text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 font-semibold text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[rgba(86,112,170,0.4)] dark:bg-[rgba(16,24,44,0.9)] dark:text-[rgba(170,184,214,0.8)]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateEventModal
          employees={employees}
          onClose={() => setShowCreate(false)}
          onCreated={fetchEvents}
        />
      )}
      {editEvent && (
        <EditEmployeesModal
          event={editEvent}
          employees={employees}
          onClose={() => setEditEvent(null)}
          onSaved={fetchEvents}
        />
      )}
    </section>
  )
}

export default AdminEventListPage
