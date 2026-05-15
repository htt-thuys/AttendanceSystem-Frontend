# User and Auth API

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

# Authenticated Headers

```json
{
  "Authorization": "Bearer <token>"
}
```

# Response Envelope for Employee APIs

```json
{
  "success": true,
  "message": "Operation message",
  "data": {}
}
```

> Note: The Auth module returns a token after login. The current Employee/User APIs do not enforce this token in routes yet, but the token is required by `/auth/logout` and `/auth/get-user`.

---

# Module Auth

## 1. Login

### POST `/auth/login`

#### Headers

```json
{
  "Content-Type": "application/json"
}
```

#### Request

```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### Notes

- The account must exist and be active.
- Password is compared directly with `password_hash`.
- Token lifetime is 60 minutes.

#### Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<token>",
  "username": "admin",
  "role": "admin",
  "full_name": "Admin User"
}
```

---

## 2. Logout

### POST `/auth/logout`

#### Headers

```json
{
  "Authorization": "Bearer <token>"
}
```

#### Request

```txt
null
```

#### Response

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 3. Get Current User

### GET `/auth/get-user`

#### Headers

```json
{
  "Authorization": "Bearer <token>"
}
```

#### Request

```txt
null
```

#### Response

```json
{
  "success": true,
  "username": "admin",
  "role": "admin",
  "full_name": "Admin User"
}
```

---

# Common Auth Errors

- `AUTH_HEADER_MISSING`
- `AUTH_HEADER_INVALID_FORMAT`
- `AUTH_INVALID_TOKEN`
- `AUTH_INVALID_CREDENTIALS`

---

# Module User / Employees

## 1. Get Employee List

### GET `/employees?skip=0&limit=100&include_inactive=false`

#### Query Params

- `skip`: default 0
- `limit`: default 100, max 1000
- `include_inactive`: default false

#### Response

```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": []
}
```
