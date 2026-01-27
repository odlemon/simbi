# 🔐 Forgot Password - Frontend Implementation Guide

## Overview

This guide provides a complete workflow and implementation instructions for the forgot password feature on the frontend. The system supports both **buyers** and **sellers** using unified endpoints.

---

## 📋 Table of Contents

1. [Complete User Flow](#complete-user-flow)
2. [API Endpoints](#api-endpoints)
3. [Frontend Implementation Steps](#frontend-implementation-steps)
4. [UI/UX Guidelines](#uiux-guidelines)
5. [Error Handling](#error-handling)

---

## Complete User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User clicks "Forgot Password" link                  │
│         → Navigate to /forgot-password page                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: User enters email address                           │
│         → Show email input field only                       │
│         → System auto-detects account type                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: User submits form                                    │
│         → POST /api/auth/forgot-password                    │
│         → Show loading state                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Show success message                                │
│         → "Check your email for reset link"                 │
│         → Link to resend email (optional)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: User receives email                                 │
│         → Email contains reset link                         │
│         → Link format: /reset-password?token=xxx&type=buyer │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: User clicks email link                              │
│         → Navigate to /reset-password page                 │
│         → Extract token and type from URL params           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 7: User enters new password                            │
│         → Show password input (with confirmation)          │
│         → Validate password strength                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 8: User submits new password                           │
│         → POST /api/auth/reset-password                     │
│         → Show loading state                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 9: Show success message                                │
│         → "Password reset successfully"                     │
│         → Redirect to login page                            │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Base URL:** `http://localhost:3006` (or your API URL)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Note:** `userType` is **NOT required**. The system automatically detects whether the email belongs to a buyer or seller by checking both tables. You can omit `userType` from the request.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request - Missing Email:**
```json
{
  "success": false,
  "message": "Email is required",
  "error": "MISSING_EMAIL",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**400 Bad Request - Invalid User Type:**
```json
{
  "success": false,
  "message": "userType must be either \"buyer\" or \"seller\"",
  "error": "INVALID_USER_TYPE",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "Buyer with this email not found",
  "error": "USER_NOT_FOUND",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

---

### 2. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Base URL:** `http://localhost:3006` (or your API URL)

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "newPassword": "NewSecurePassword123!",
  "userType": "buyer"  // Required: Extract from URL parameter (?type=buyer)
}
```

**Note:** The `userType` is required for reset password and should be extracted from the URL parameter `type` that comes in the email link. The backend automatically includes this in the reset link based on which account type was found.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "message": "Token and new password are required",
  "error": "MISSING_FIELDS",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**400 Bad Request - Weak Password:**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters long",
  "error": "WEAK_PASSWORD",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

**400 Bad Request - Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "error": "INVALID_TOKEN",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

---

## Frontend Implementation Steps

### Step 1: Create Forgot Password Page

**Route:** `/forgot-password`

**Components Needed:**
- Email input field
- Submit button
- Loading state indicator
- Success/error message display

**Key Features:**
- Email validation (format check)
- Show loading state during API call
- Display success message (always show success for security)
- Link to login page
- Optional: "Resend email" button

**Note:** Do NOT include a user type selector. The system automatically detects whether the email belongs to a buyer or seller.

---

### Step 2: Handle Email Link Click

**Route:** `/reset-password`

**URL Parameters:**
- `token` - Reset token from email
- `type` - User type ("buyer" or "seller") - automatically included by backend

**What to Do:**
1. Extract `token` and `type` from URL query parameters
2. Validate that both parameters exist
3. If missing, show error and redirect to forgot-password page
4. Use both `token` and `type` when calling reset password endpoint

**Note:** The `type` parameter is automatically included in the email link by the backend based on which account type was found. You don't need to ask the user for it.

**Example URL:**
```
http://your-frontend.com/reset-password?token=a1b2c3d4e5f6...&type=buyer
```

---

### Step 3: Create Reset Password Page

**Route:** `/reset-password`

**Components Needed:**
- New password input field
- Confirm password input field
- Password strength indicator (optional)
- Submit button
- Loading state indicator
- Success/error message display

**Key Features:**
- Password validation (minimum 8 characters)
- Password confirmation matching
- Show/hide password toggle
- Password strength meter (optional)
- Disable form if token is invalid/expired

---

### Step 4: Handle Password Reset Submission

**What to Do:**
1. Validate password meets requirements (min 8 chars)
2. Validate password confirmation matches
3. Call reset password API endpoint
4. Show loading state
5. On success: Show success message → Redirect to login
6. On error: Show error message → Allow retry

---

## UI/UX Guidelines

### Forgot Password Page

**Layout:**
```
┌─────────────────────────────────────┐
│         [Logo]                      │
│                                     │
│    Forgot Password?                 │
│                                     │
│    Enter your email address and     │
│    we'll send you a reset link.     │
│                                     │
│    [Email Input Field]              │
│                                     │
│                                     │
│                                     │
│    [Send Reset Link Button]         │
│                                     │
│    [Back to Login]                  │
└─────────────────────────────────────┘
```

**States:**
- **Default:** Show email input and submit button
- **Loading:** Disable button, show spinner
- **Success:** Show success message, hide form (or show resend option)
- **Error:** Show error message below form

---

### Reset Password Page

**Layout:**
```
┌─────────────────────────────────────┐
│         [Logo]                      │
│                                     │
│    Reset Your Password              │
│                                     │
│    Enter your new password below.  │
│                                     │
│    [New Password Input]            │
│    [Password Strength Indicator]   │
│                                     │
│    [Confirm Password Input]        │
│                                     │
│    [Reset Password Button]         │
│                                     │
│    [Back to Login]                  │
└─────────────────────────────────────┘
```

**States:**
- **Default:** Show password inputs and submit button
- **Loading:** Disable button, show spinner
- **Success:** Show success message → Auto-redirect to login after 3 seconds
- **Error:** Show error message, allow retry

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid/Expired Token

**When:** User clicks old reset link or token expired (1 hour limit)

**What to Show:**
```
❌ This reset link has expired or is invalid.
   Please request a new password reset link.
   
   [Request New Link Button]
```

**Action:** Redirect to forgot-password page

---

#### 2. Weak Password

**When:** Password is less than 8 characters

**What to Show:**
```
⚠️ Password must be at least 8 characters long.
```

**Action:** Highlight password field, show validation message

---

#### 3. Password Mismatch

**When:** Password and confirmation don't match

**What to Show:**
```
⚠️ Passwords do not match.
```

**Action:** Highlight confirmation field, prevent submission

---

#### 4. Network Error

**When:** API request fails (network issue, server down)

**What to Show:**
```
❌ Unable to connect to server. Please check your internet connection and try again.
   
   [Retry Button]
```

**Action:** Allow retry, show retry button

---

#### 5. Email Not Found

**Note:** For security, the API always returns success even if email doesn't exist. Don't show "email not found" errors.

**What to Show:**
```
✅ If an account exists with this email, a password reset link has been sent.
   Please check your email inbox.
```

---

## Security Best Practices

### 1. Always Show Success Message

**Why:** Prevents email enumeration attacks

**What to Do:**
- Always show success message, even if email doesn't exist
- Display: "If an account exists with this email, a password reset link has been sent"

---

### 2. Validate Token on Page Load

**Why:** Prevents users from submitting forms with invalid tokens

**What to Do:**
- Extract `token` and `type` from URL query parameters on page load
- If missing or invalid, show error and disable form
- Redirect to forgot-password page if token is invalid

---

### 3. Password Requirements

**Requirements:**
- Minimum 8 characters
- Show validation in real-time
- Prevent submission if requirements not met

**What to Do:**
- Validate password length before submission
- Show validation message if password is too short
- Ensure password confirmation matches

---

### 4. Token Expiration Handling

**Token Expires:** 1 hour after generation

**What to Show:**
```
❌ This reset link has expired.
   Please request a new password reset link.
   
   [Request New Link]
```

---

## Testing Checklist

- [ ] User can request password reset with email
- [ ] Success message shows even if email doesn't exist
- [ ] Email is received with reset link
- [ ] Reset link contains correct token and type parameters
- [ ] User can navigate to reset password page from email link
- [ ] Token validation works (invalid token shows error)
- [ ] Expired token shows appropriate error
- [ ] Password validation works (min 8 chars)
- [ ] Password confirmation matching works
- [ ] Password reset succeeds with valid token
- [ ] User is redirected to login after successful reset
- [ ] Error messages are clear and helpful
- [ ] Loading states work correctly
- [ ] Network errors are handled gracefully

---

## Environment Variables

Make sure your frontend knows the API base URL:

```env
# .env file
VITE_API_BASE_URL=http://localhost:3006
# or
REACT_APP_API_BASE_URL=http://localhost:3006
```

---

## Email Link Format

The reset link in the email will be:
```
http://your-frontend-url/reset-password?token={64-char-hex-token}&type={buyer|seller}
```

**Example:**
```
http://localhost:3000/reset-password?token=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456&type=buyer
```

---

## Important Notes

1. **Token Expiration:** Reset tokens expire after **1 hour**
2. **One-Time Use:** Tokens are cleared after successful password reset
3. **User Type Auto-Detection:** The system automatically detects whether an email belongs to a buyer or seller. Users do NOT need to specify account type when requesting password reset.
4. **Email Security:** Always show success message (prevents email enumeration)
5. **Password Requirements:** Minimum 8 characters
6. **URL Parameters:** Extract `token` and `type` from URL query parameters in the email link. The `type` is automatically included by the backend.
7. **For Forgot Password:** Only require email address - no user type selector needed
8. **For Reset Password:** Extract `type` from URL parameter - it's automatically included in the email link

---

## Related Documentation

- [Unified Login Endpoint](./UNIFIED_LOGIN_ERROR_RESPONSES.md)
- [Unified Registration Endpoint](./UNIFIED_REGISTRATION_ENDPOINT_DOCUMENTATION.md)
- [Password Reset API](./PASSWORD_RESET_API.md)

---

**Last Updated:** January 27, 2026  
**API Version:** 1.0  
**Base URL:** `http://localhost:3006`
