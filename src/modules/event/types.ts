export interface EventItem {
  id: string
  event_code: string
  title: string
  event_type: string
  start_at: string
  end_at: string
  room_id: string | null
  total_employees: number
}

export interface EventListResponse {
  items: EventItem[]
  total: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string | null
  data: T
}

export interface CreateEventPayload {
  event_code: string
  title: string
  event_type: string
  start_at: string
  end_at: string
  room_id: string | null
  employee_ids: string[]
}

export interface UpdateEmployeesPayload {
  employee_ids: string[]
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  event_id: string
  check_in_at: string | null
  status: string | null
  note: string | null
}

export interface AttendanceStats {
  event_id: string
  total: number
  present: number
  late: number
  absent: number
  not_checked_in: number
}

export interface Employee {
  id: string
  employee_code: string
  full_name: string
  email: string
  position: string
  avatar_url: string | null
  is_active: boolean
}
