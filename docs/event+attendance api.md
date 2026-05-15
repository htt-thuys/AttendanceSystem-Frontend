# Define API: Frontend ↔ Backend

## Base URL

```txt
server_url
```

---

# Common Headers

```json
{
  "Content-Type": "application/json"
}
```

> NOTE: Chưa có auth trong 2 module này.

---

# Module Event

---

# 1. Create Event + Assign Employees

## POST `/events`

### Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "event_code": "EVT-001",
  "title": "Demo",
  "event_type": "meeting",
  "start_at": "2026-05-12T08:00:00Z",
  "end_at": "2026-05-12T10:00:00Z",
  "room_id": null,
  "employee_ids": [
    "<employee_uuid_1>",
    "<employee_uuid_2>"
  ]
}
```

---

# 2. Get Event List

## GET `/events`

### Headers

```txt
null
```

### Request Body

```txt
null
```

---

# 3. Get Event Detail

## GET `/events/{event_id}`

### Headers

```txt
null
```

### Request Body

```txt
null
```

---

# 4. Update Employee List of Event

## PUT `/events/{event_id}/employees`

### Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "employee_ids": [
    "<employee_uuid_1>",
    "<employee_uuid_3>"
  ]
}
```

---

# Module Attendance

---

# 1. Check-in Attendance

## POST `/attendance/check-in`

### Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "employee_id": "<employee_uuid_1>",
  "event_id": "<event_uuid>",
  "recognition_log_id": "<random_uuid>",
  "check_in_at": "2026-05-12T07:55:00Z"
}
```

> WARNING: Bắt buộc attendance record đã tồn tại trước khi check-in.

---

# 2. Get Attendance History by Event

## GET `/attendance/history?event_id=<event_uuid>`

### Headers

```txt
null
```

### Request Body

```txt
null
```

---

# 3. Get Attendance Statistics by Event

## GET `/attendance/stats?event_id=<event_uuid>`

### Headers

```txt
null
```

### Request Body

```txt
null
```

---

# Comments

```txt
No comments
```
