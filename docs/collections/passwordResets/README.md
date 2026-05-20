# `passwordResets` collection

Short-lived rows for forgot-password. Only **SHA-256 hash** of the token is stored.

**Base path:** `/api/auth`  
**Also see:** [AUTH_USERS_API.md](../../AUTH_USERS_API.md)

---

## MongoDB document (stored)

```json
{
  "id": "pr1778570373221",
  "userId": "u1",
  "tokenHash": "b286ebe42e0c8731646ae03449bce0c2f3a7c8c878aec6854f256716e8f4589a",
  "createdAt": "2026-05-12T07:19:33.221Z",
  "expiresAt": 1778573973221,
  "usedAt": null
}
```

After use:

```json
{
  "id": "pr1778570373221",
  "userId": "u1",
  "tokenHash": "b286ebe42e0c8731646ae03449bce0c2f3a7c8c878aec6854f256716e8f4589a",
  "createdAt": "2026-05-12T07:19:33.221Z",
  "expiresAt": 1778573973221,
  "usedAt": "2026-05-12T07:19:34.559Z"
}
```

---

## `POST /api/auth/forgot-password`

Creates a row in this collection (if user has a password).

### Request

```json
{
  "email": "demo@aicart.com"
}
```

### Response `200` (production)

```json
{
  "message": "If an account exists for this email, a reset link is on its way."
}
```

### Response `200` (development — account exists)

```json
{
  "message": "If an account exists for this email, a reset link is on its way.",
  "devResetUrl": "http://localhost:5173/reset-password?token=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
}
```

Same message whether or not the email exists (no enumeration).

### Error `400`

```json
{ "message": "Email is required" }
```

---

## `GET /api/auth/reset-password/validate?token=...`

Reads `passwordResets` by `tokenHash`. No auth header.

### Request

```
GET /api/auth/reset-password/validate?token=a1b2c3d4e5f6...
```

### Response `200` — valid

```json
{
  "valid": true
}
```

### Response `200` — invalid / used / expired

```json
{
  "valid": false
}
```

```json
{
  "valid": false,
  "reason": "used"
}
```

```json
{
  "valid": false,
  "reason": "expired"
}
```

---

## `POST /api/auth/reset-password`

Marks row `usedAt` and updates `users.password`.

### Request

```json
{
  "token": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "password": "newpassword123"
}
```

### Response `200`

```json
{
  "message": "Password updated successfully"
}
```

### Errors

```json
{ "message": "Token and password are required" }
```

```json
{ "message": "Password must be at least 6 characters" }
```

```json
{ "message": "Invalid or expired reset link" }
```

```json
{ "message": "This reset link has already been used" }
```

---

## Code

- `Backend/src/routes/auth.routes.js`
