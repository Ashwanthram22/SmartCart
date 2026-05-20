# Auth & Users API

SmartCart authentication uses **`/api/auth`**. After login or register, store `jwt_token` and send it on protected routes:

```http
Authorization: Bearer <jwt_token>
```

---

## Shared `user` object (in responses)

Password is **never** returned. The API always uses this shape:

```json
{
  "id": "u1001",
  "name": "Demo User",
  "email": "demo@aicart.com",
  "role": "customer",
  "isAdmin": false
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique user id (JWT `sub`, used as `userId` on cart/orders/etc.) |
| `name` | Display name |
| `email` | Login email |
| `role` | `"customer"` or `"admin"` |
| `isAdmin` | `true` when `role === "admin"` or `isAdmin` flag on account |

---

## MongoDB `users` document (stored server-side)

```json
{
  "id": "u1001",
  "name": "Demo User",
  "email": "demo@aicart.com",
  "password": "$2b$10$...bcryptHash...",
  "role": "customer",
  "provider": null,
  "isAdmin": false
}
```

- `password`: bcrypt hash only; never sent to the client.
- Google accounts: `"password": null`, `"provider": "google"`.

---

## 1. Login (existing user)

**`POST /api/auth/login`**

### Request body (frontend)

```json
{
  "email": "demo@aicart.com",
  "password": "demo123"
}
```

Frontend: `login({ email, password })` from `api/client.js` (`Login.jsx`).

### Success response — `200`

```json
{
  "message": "Login successful",
  "jwt_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "u1",
    "name": "Demo User",
    "email": "demo@aicart.com",
    "role": "customer",
    "isAdmin": false
  }
}
```

### Error responses

| Status | Body |
|--------|------|
| `400` | `{ "message": "Email and password are required" }` |
| `401` | `{ "message": "Invalid credentials" }` |

---

## 2. Register (new user)

**`POST /api/auth/register`**

### Request body (frontend)

```json
{
  "name": "Ashwanth Ram",
  "email": "ashwanth@example.com",
  "password": "mypassword123"
}
```

Frontend: `register({ name, email, password })` from `Register.jsx`.

**Validation**

- `name`, `email`, `password` are required.
- `password` minimum **6** characters (frontend + backend).

### Success response — `201`

```json
{
  "message": "Account created successfully",
  "jwt_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "u1778574592688",
    "name": "Ashwanth Ram",
    "email": "ashwanth@example.com",
    "role": "customer",
    "isAdmin": false
  }
}
```

Frontend stores `jwt_token` and redirects to `/home`.

### Error responses

| Status | Body |
|--------|------|
| `400` | `{ "message": "Name, email and password are required" }` |
| `400` | `{ "message": "Password must be at least 6 characters" }` |
| `409` | `{ "message": "An account with this email already exists" }` |

### MongoDB document created

```json
{
  "id": "u1778574592688",
  "name": "Ashwanth Ram",
  "email": "ashwanth@example.com",
  "password": "$2b$10$...bcryptHash...",
  "role": "customer"
}
```

---

## 3. Get current user (logged in)

**`GET /api/auth/me`** — requires `Authorization: Bearer <token>`

### Request

No body.

### Success response — `200`

```json
{
  "user": {
    "id": "u1",
    "name": "Demo User",
    "email": "demo@aicart.com",
    "role": "customer",
    "isAdmin": false
  }
}
```

### Error responses

| Status | Body |
|--------|------|
| `401` | `{ "message": "Authorization header required" }` or invalid/expired token |
| `404` | `{ "message": "User not found" }` |

---

## 4. Forgot password (request reset link)

**`POST /api/auth/forgot-password`**

### Request body (frontend)

```json
{
  "email": "demo@aicart.com"
}
```

Frontend: `requestPasswordReset({ email })` from `ForgotPassword.jsx`.

### Success response — `200`

Always returns the same message (does not reveal whether the email exists):

```json
{
  "message": "If an account exists for this email, a reset link is on its way."
}
```

### Development only

When `NODE_ENV !== "production"` and the account exists with a password:

```json
{
  "message": "If an account exists for this email, a reset link is on its way.",
  "devResetUrl": "http://localhost:5173/reset-password?token=<64-char-hex>"
}
```

Production should not include `devResetUrl` (email service sends the link).

### Error responses

| Status | Body |
|--------|------|
| `400` | `{ "message": "Email is required" }` |

### MongoDB `passwordResets` document (server-side)

```json
{
  "id": "pr1778570373221",
  "userId": "u1",
  "tokenHash": "sha256OfRawToken",
  "createdAt": "2026-05-12T07:19:33.221Z",
  "expiresAt": 1778573973221,
  "usedAt": null
}
```

The raw token appears only in the reset URL / `devResetUrl`, not stored in plain text.

---

## 5. Reset password (from email link)

Two steps: validate token, then set a new password.

### Step A — Validate token

**`GET /api/auth/reset-password/validate?token=<64-char-hex>`**

#### Success response — `200`

Valid:

```json
{ "valid": true }
```

Invalid:

```json
{ "valid": false }
```

Used:

```json
{ "valid": false, "reason": "used" }
```

Expired:

```json
{ "valid": false, "reason": "expired" }
```

---

### Step B — Set new password

**`POST /api/auth/reset-password`**

#### Request body (frontend)

```json
{
  "token": "64-character-hex-from-url-query",
  "newPassword": "newSecurePassword1"
}
```

Frontend: `resetPassword({ token, newPassword })` from `ResetPassword.jsx`.  
`token` is read from `/reset-password?token=...`.

#### Success response — `200`

```json
{
  "message": "Password reset — you can sign in now."
}
```

#### Error responses — `400`

```json
{ "message": "Reset token is invalid" }
```

```json
{ "message": "Password must be at least 6 characters" }
```

```json
{ "message": "Reset link is invalid or already used" }
```

```json
{ "message": "Reset link has already been used" }
```

```json
{ "message": "Reset link has expired — request a new one" }
```

#### MongoDB updates

- `users.password` → new bcrypt hash
- `passwordResets.usedAt` → ISO timestamp

---

## 6. Change password (logged in — Settings → Security)

**`POST /api/auth/change-password`** — requires `Authorization: Bearer <token>`

Used when the user is already logged in and knows their current password.  
**Not** the same as forgot/reset (no email token).

### Request body (frontend)

```json
{
  "currentPassword": "demo123",
  "newPassword": "newPassword456"
}
```

Frontend: `changePassword({ currentPassword, newPassword })` from `SettingsSecurity.jsx`.  
`confirmPassword` is validated on the frontend only and is **not** sent to the API.

### Success response — `200`

```json
{
  "message": "Password updated"
}
```

### Error responses

| Status | Body |
|--------|------|
| `400` | `{ "message": "Current and new password are required" }` |
| `400` | `{ "message": "New password must be at least 6 characters" }` |
| `400` | `{ "message": "New password must be different from current" }` |
| `400` | `{ "message": "This account uses a social login (Google) — set a password via the social provider." }` |
| `401` | `{ "message": "Current password is incorrect" }` |
| `404` | `{ "message": "User not found" }` |

### MongoDB

Updates `users.password` (bcrypt hash) only. Does not use `passwordResets`.

---

## JWT payload (inside `jwt_token`)

Decoded token contains:

```json
{
  "sub": "u1",
  "email": "demo@aicart.com",
  "role": "customer",
  "iat": 1234567890,
  "exp": 1234567890
}
```

- `sub` = user `id` (used as `userId` on cart, orders, addresses, etc.)

---

## Flow summary

```text
Register     POST /auth/register          { name, email, password }
             → jwt_token + user

Login        POST /auth/login             { email, password }
             → jwt_token + user

Profile      GET  /auth/me                Authorization: Bearer …
             → { user }

Forgot       POST /auth/forgot-password   { email }
             → generic message (+ devResetUrl in dev)

Reset        GET  /auth/reset-password/validate?token=…
             POST /auth/reset-password    { token, newPassword }

Change       POST /auth/change-password   { currentPassword, newPassword }
             (Bearer token required)
```

---

## Related files

| Area | Path |
|------|------|
| Backend routes | `Backend/src/routes/auth.routes.js` |
| Frontend API client | `Frontend/src/api/client.js` |
| Login page | `Frontend/src/pages/Login/Login.jsx` |
| Register page | `Frontend/src/pages/Register/Register.jsx` |
| Forgot password | `Frontend/src/pages/ForgotPassword/ForgotPassword.jsx` |
| Reset password | `Frontend/src/pages/ResetPassword/ResetPassword.jsx` |
| Change password | `Frontend/src/pages/Profile/SettingsSecurity.jsx` |
