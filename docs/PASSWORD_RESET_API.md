# Password Reset API Documentation

## Overview
Unified password reset feature that works for both **buyers** and **sellers** using a single endpoint.

---

## 🔐 Endpoints

### 1. Forgot Password (Request Password Reset)
**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request a password reset email. Works for both buyers and sellers.

**Authentication:** Not required (Public endpoint)

**Request Body:**
```json
{
  "email": "user@example.com",
  "userType": "buyer"  // Optional: "buyer" or "seller"
}
```

**Field Requirements:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address of the user |
| `userType` | string | No | Optional: "buyer" or "seller" to specify user type. If not provided, system will auto-detect |

**Example Request:**
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "buyer@example.com"
}
```

**Response Body (Success - 200):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Response Body (Error - 400):**
```json
{
  "success": false,
  "message": "Email is required",
  "error": "MISSING_EMAIL",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Response Body (Error - 404):**
```json
{
  "success": false,
  "message": "Buyer with this email not found",
  "error": "USER_NOT_FOUND",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**What Happens:**
1. System looks up user by email (tries buyer first, then seller)
2. Generates secure reset token (32-byte random hex string)
3. Sets token expiration to 1 hour from now
4. Sends password reset email with link containing token
5. Returns success message (for security, always returns success even if email doesn't exist)

**Email Content:**
- User receives HTML email with reset button
- Reset link: `{FRONTEND_URL}/reset-password?token={token}&type={buyer|seller}`
- Link expires in 1 hour
- Includes instructions and security notes

---

### 2. Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using the token received via email.

**Authentication:** Not required (Public endpoint)

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePassword123!",
  "userType": "buyer"  // Optional: "buyer" or "seller"
}
```

**Field Requirements:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Reset token from email link |
| `newPassword` | string | Yes | New password (minimum 8 characters) |
| `userType` | string | No | Optional: "buyer" or "seller" to validate user type |

**Example Request:**
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "newPassword": "MyNewSecurePassword123!"
}
```

**Response Body (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Response Body (Error - 400):**
```json
{
  "success": false,
  "message": "Token and new password are required",
  "error": "MISSING_FIELDS",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

```json
{
  "success": false,
  "message": "Password must be at least 8 characters long",
  "error": "WEAK_PASSWORD",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "error": "INVALID_TOKEN",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**What Happens:**
1. Validates token is not expired (must be within 1 hour)
2. Validates new password meets requirements (minimum 8 characters)
3. Hashes new password with bcrypt (12 rounds)
4. Updates user password in database
5. Clears reset token and expiration
6. Returns success message

---

## 🔄 Complete Workflow

### Step 1: User Requests Password Reset
```bash
POST /api/auth/forgot-password
{
  "email": "buyer@example.com"
}
```

**Result:** User receives email with reset link

### Step 2: User Clicks Reset Link
Frontend redirects to: `/reset-password?token=abc123...&type=buyer`

### Step 3: User Sets New Password
```bash
POST /api/auth/reset-password
{
  "token": "abc123...",
  "newPassword": "MyNewPassword123!",
  "userType": "buyer"
}
```

**Result:** Password updated, user can login

---

## 📧 Email Template

Users receive a professional HTML email containing:
- **Subject:** "Reset Your Password - Simbi Market"
- **Content:** 
  - Personalized greeting
  - Reset button with link
  - Alternative text link
  - Security instructions
  - Expiration notice (1 hour)
- **Styling:** Professional gradient header, responsive design

---

## 🔒 Security Features

1. **Token Security:**
   - 32-byte cryptographically secure random token
   - Stored in database (hashed)
   - Expires after 1 hour

2. **Email Enumeration Prevention:**
   - Always returns success message for forgot-password requests
   - Doesn't reveal if email exists or not

3. **Password Requirements:**
   - Minimum 8 characters
   - Hashed with bcrypt (12 rounds)

4. **Token Validation:**
   - Checks expiration time
   - Validates token exists
   - Clears token after use

5. **User Type Validation:**
   - Optional userType parameter for extra validation
   - Auto-detects user type if not specified

---

## 🧪 Testing Examples

### Test 1: Buyer Forgot Password
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "buyer@example.com",
  "userType": "buyer"
}
```

### Test 2: Seller Forgot Password (Auto-detect)
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "seller@example.com"
}
```

### Test 3: Reset Password
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "token-from-email",
  "newPassword": "NewPassword123!",
  "userType": "buyer"
}
```

---

## 📝 Database Schema Changes

### Buyer Model:
```prisma
model Buyer {
  // ... existing fields ...
  passwordResetToken        String?
  passwordResetExpires      DateTime?
  // ... other fields ...
}
```

### Seller Model:
```prisma
model Seller {
  // ... existing fields ...
  passwordResetToken        String?
  passwordResetExpires      DateTime?
  // ... other fields ...
}
```

---

## ⚠️ Important Notes

1. **Environment Variables:** Set frontend URLs in your `.env` file for reset links
   ```env
   # Buyer frontend URL (default: http://localhost:3000)
   BUYER_FRONTEND_URL=http://localhost:3000
   # or for production:
   BUYER_FRONTEND_URL=https://simbi-buyer.vercel.app
   
   # Seller frontend URL (default: http://localhost:5000)
   SELLER_FRONTEND_URL=http://localhost:5000
   # or for production:
   SELLER_FRONTEND_URL=https://simbi-seller.vercel.app
   
   # Fallback (if specific URL not set)
   FRONTEND_URL=http://localhost:3000
   ```

   **URL Priority:**
   - For **buyers**: Uses `BUYER_FRONTEND_URL` → falls back to `FRONTEND_URL` → defaults to `http://localhost:3000`
   - For **sellers**: Uses `SELLER_FRONTEND_URL` → falls back to `FRONTEND_URL` → defaults to `http://localhost:5000`

2. **Token Expiration:** Reset tokens expire after 1 hour

3. **One-time Use:** Tokens are cleared after successful password reset

4. **Auto-detection:** If `userType` is not provided, system tries buyer first, then seller

5. **Email Delivery:** Uses existing ZeptoMail service for email delivery

---

## 🔧 Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `MISSING_EMAIL` | Email field is required | 400 |
| `MISSING_FIELDS` | Token or password is missing | 400 |
| `INVALID_USER_TYPE` | userType must be "buyer" or "seller" | 400 |
| `WEAK_PASSWORD` | Password must be at least 8 characters | 400 |
| `INVALID_TOKEN` | Token is invalid or expired | 400 |
| `USER_NOT_FOUND` | Email not found (only if userType specified) | 404 |
| `INTERNAL_ERROR` | Server error | 500 |

---

## ✅ Migration Required

After updating the schema, run:
```bash
npx prisma migrate dev --name add_password_reset_tokens
```

This will add `passwordResetToken` and `passwordResetExpires` fields to both `Buyer` and `Seller` models.

