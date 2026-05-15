import type {
  EventItem,
  EventListResponse,
  ApiResponse,
  CreateEventPayload,
  UpdateEmployeesPayload,
  AttendanceRecord,
  AttendanceStats,
  Employee,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  const body: ApiResponse<T> = await response.json()

  if (!response.ok || !body.success) {
    throw new Error(body.message || `Request failed with status ${response.status}`)
  }

  return body.data
}

// ─── Events ────────────────────────────────────────────

export function getEvents(): Promise<EventListResponse> {
  return request<EventListResponse>('/events')
}

export function getEvent(eventId: string): Promise<EventItem> {
  return request<EventItem>(`/events/${eventId}`)
}

export function createEvent(payload: CreateEventPayload): Promise<EventItem> {
  return request<EventItem>('/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateEventEmployees(
  eventId: string,
  payload: UpdateEmployeesPayload,
): Promise<void> {
  return request<void>(`/events/${eventId}/employees`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

// ─── Attendance ────────────────────────────────────────

export function getAttendanceHistory(eventId: string): Promise<AttendanceRecord[]> {
  return request<AttendanceRecord[]>(`/attendance/history?event_id=${eventId}`)
}

export function getAttendanceStats(eventId: string): Promise<AttendanceStats> {
  return request<AttendanceStats>(`/attendance/stats?event_id=${eventId}`)
}

// ─── Employees ─────────────────────────────────────────

export function getEmployees(): Promise<Employee[]> {
  return request<Employee[]>('/employees?limit=1000')
}
