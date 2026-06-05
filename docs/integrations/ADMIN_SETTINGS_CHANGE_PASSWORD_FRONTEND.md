# Admin portal — Settings: change password (frontend guide)

> **This is the API reference for the frontend.** All endpoint docs live here in Markdown — not in Swagger/YAML.

This document is for the **admin portal only**. It covers changing a password **while logged in** from **Settings → Password** (`/settings/password`).

Forgot/reset password (logged out) uses different endpoints — see [Forgot / reset password](#forgot--reset-password-logged-out) below.

---

## Overview

| Flow | When | Endpoint |
|------|------|----------|
| **Change password** | User is signed in; Settings tab | `PUT /api/admin/settings/change-password` |
| Forgot password | User is logged out | `POST /api/auth/forgot-password` |
| Reset password | User clicked email link | `POST /api/auth/reset-password` |

**Preferred endpoint for the Settings UI:** `PUT /api/admin/settings/change-password`  
**Alias (same handler):** `PUT /api/admin/auth/change-password`

Both require the same admin JWT from unified login (`POST /api/auth/login`).

---

## Story — Change password in Settings

**As** any signed-in admin (Super Admin, FinOps, Compliance, Logistics, Tech Support)  
**I want** a **Password** item under **Settings**  
**So that** I can replace a temporary or weak password without signing out

### Navigation

```
Settings (sidebar or tab)
  ├── Password        ← this doc (`/settings/password`)
  ├── Team            ← invite/list admins
  └── … (other settings by role)
```

All admin portal roles see **Settings → Password**. No Super Admin requirement.

### What the user sees

Page: **`/settings/password`**

Form fields:

| Field | Required | Notes |
|-------|----------|-------|
| Current password | Yes | Masked input |
| New password | Yes | Min 8 characters |
| Confirm new password | Yes | Client-side only; must match new password |

Actions:

- **Save** / **Change password** — submits to API
- Success toast: *“Password changed successfully.”*
- Optional: dismiss first-login banner after success (invited users with temp password)

### API contract

#### `PUT /api/admin/settings/change-password`

| | |
|---|---|
| **Access** | Any signed-in admin portal user |
| **Auth** | `Authorization: Bearer <token>` (JWT from `POST /api/auth/login`) |
| **Content-Type** | `application/json` |

**Request**

```
PUT {VITE_API_BASE_URL}/api/admin/settings/change-password
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "timestamp": "2026-06-05T12:00:00.000Z"
}
```

**Error responses**

| HTTP | `error` | `message` | When |
|------|---------|-----------|------|
| 400 | `MISSING_PASSWORDS` | Current password and new password are required | Empty body fields |
| 400 | `PASSWORD_TOO_SHORT` | New password must be at least 8 characters long | `newPassword` too short |
| 400 | `PASSWORD_UNCHANGED` | New password must be different from your current password | New equals current |
| 400 | `INVALID_CURRENT_PASSWORD` | Current password is incorrect | Wrong current password |
| 401 | — | Authentication required. No token provided. | Missing/expired JWT |
| 404 | `ADMIN_NOT_FOUND` | Admin not found | Rare; stale session |
| 500 | `CHANGE_PASSWORD_FAILED` | Failed to change password | Server error |

### Frontend validation (before API call)

1. All three fields filled.
2. `newPassword.length >= 8`.
3. `newPassword === confirmNewPassword`.
4. `newPassword !== currentPassword` (optional early check; server also enforces).

Do **not** send `confirmNewPassword` to the API.

### After success

- Show success message.
- Clear the form fields.
- **Do not** log the user out automatically (current backend behaviour). Optionally redirect to dashboard or keep user on Settings.
- JWT remains valid until expiry.

### Audit

Server writes `PASSWORD_CHANGED` to the audit log for the authenticated admin’s `id`. Super Admins can see this in **Settings → Audit**.

#### Alias: `PUT /api/admin/auth/change-password`

Same request body, responses, and auth. Use **`/api/admin/settings/change-password`** in the Settings UI; the `/auth/` path exists for backward compatibility.

#### Postman / curl example

```bash
curl -X PUT "http://localhost:5000/api/admin/settings/change-password" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"OldPass123!\",\"newPassword\":\"NewSecurePass456!\"}"
```

---

## Implementation sketch

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL; // e.g. http://localhost:5000

async function changeAdminPassword(
  token: string,
  currentPassword: string,
  newPassword: string
) {
  const res = await fetch(`${API_BASE}/api/admin/settings/change-password`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to change password");
  }
  return data;
}
```

### Settings page checklist

- [ ] Route: `/settings/password` under authenticated admin layout.
- [ ] Nav: **Settings → Password** visible to all admin portal roles.
- [ ] Uses admin JWT from `POST /api/auth/login` (`userType === "admin"`).
- [ ] Calls `PUT /api/admin/settings/change-password`.
- [ ] Client validation: min length, confirm match.
- [ ] Maps `INVALID_CURRENT_PASSWORD` and `PASSWORD_UNCHANGED` to inline field errors.
- [ ] Success toast; clear form.
- [ ] First-login banner for invited users links to this page.

---

## Forgot / reset password (logged out)

These are **not** under Settings. Use the public auth routes.

### Forgot password

#### `POST /api/auth/forgot-password`

| | |
|---|---|
| **Access** | Public (no JWT) |
| **Content-Type** | `application/json` |

**Request body**

```json
{
  "email": "admin@example.com",
  "userType": "admin"
}
```

**Success — `200`** (always generic; do not reveal if email exists)

```json
{
  "success": true,
  "message": "If an account exists, a password reset link has been sent to your email."
}
```

Reset link in email: `https://simbimarket.com/reset-password?token=...` (no `type` for admin).

### Reset password

#### `POST /api/auth/reset-password`

| | |
|---|---|
| **Access** | Public (no JWT) |
| **Content-Type** | `application/json` |

**Request body**

```json
{
  "token": "<from-email-link>",
  "newPassword": "NewSecurePass456!"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

After reset, sign in again with `POST /api/auth/login`.

---

## Related endpoints

| Purpose | Method | Path |
|---------|--------|------|
| Login (all users) | POST | `/api/auth/login` |
| Session refresh | GET | `/api/auth/me` |
| Admin profile | GET | `/api/admin/auth/me` |
| Change password (Settings) | PUT | `/api/admin/settings/change-password` |
| Change password (alias) | PUT | `/api/admin/auth/change-password` |
| Forgot password | POST | `/api/auth/forgot-password` |
| Reset password | POST | `/api/auth/reset-password` |

---

## Environment

```env
VITE_API_BASE_URL=http://localhost:5000
```

Match the API server `PORT` in `.env` (currently `5000` in local dev).

See also: [ADMIN_USERS_AND_AUDIT_FRONTEND.md](./ADMIN_USERS_AND_AUDIT_FRONTEND.md) for team management, audit trail, and unified login.
