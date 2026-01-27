# 🔐 Unified Login — Error Responses Documentation

Complete documentation of all error responses returned when login is unsuccessful.

## Endpoint

```
POST /api/auth/login
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "<error message>",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**HTTP Status Code:** `401 Unauthorized` (except for validation errors which use `400 Bad Request`)

---

## Error Scenarios

### 1. Missing Required Fields

**HTTP Status:** `400 Bad Request`

**Response:**
```json
{
  "success": false,
  "message": "Email and password are required",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- `email` is missing or empty
- `password` is missing or empty

---

### 2. Invalid Email or Password (User Not Found)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Email does not exist in any user type (admin, seller, staff, or buyer)
- This is a generic message to prevent email enumeration attacks

---

### 3. Wrong Password (First Attempt)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Invalid credentials. You have 2 attempts remaining before your account is locked for 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- User exists but password is incorrect
- This is the **first failed attempt** (1 of 3)

---

### 4. Wrong Password (Second Attempt)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Invalid credentials. You have 1 attempt remaining before your account is locked for 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- User exists but password is incorrect
- This is the **second failed attempt** (2 of 3)

---

### 5. Wrong Password (Third Attempt — Account Locked)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Account locked due to 3 failed login attempts. Please try again in 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- User exists but password is incorrect
- This is the **third failed attempt** (3 of 3)
- Account is now locked for 15 minutes

---

### 6. Account Already Locked

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Account locked due to multiple failed login attempts. Please try again in 12 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Account is already locked from previous failed attempts
- Message shows remaining lockout time (dynamic, in minutes)
- Lockout duration: **15 minutes** from the time of the third failed attempt

**Note:** The remaining minutes in the message will vary based on when the lockout was initiated.

---

### 7. IP Rate Limit Exceeded

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Too many login attempts from this device. Please try again in 10 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- More than **5 failed login attempts** from the same IP address within **15 minutes**
- Applies across all user types (prevents bypassing by trying different user types)
- Message shows remaining time until rate limit resets (dynamic, in minutes)

**Rate Limit Rules:**
- Maximum: **5 attempts per 15 minutes** from the same IP
- Applies to all user types combined
- Resets after 15 minutes from the first attempt in the window

---

### 8. Account Status: Inactive/Suspended/Banned

**HTTP Status:** `401 Unauthorized`

#### For Admin:

**Response:**
```json
{
  "success": false,
  "message": "Account is inactive. Please contact support.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Possible messages:**
- `"Account is inactive. Please contact support."`
- `"Account is suspended. Please contact support."`
- `"Account is banned. Please contact support."`

#### For Seller:

**Response:**
```json
{
  "success": false,
  "message": "Account is inactive. Please contact support.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Possible messages:**
- `"Account is inactive. Please contact support."`
- `"Account is suspended. Please contact support."`
- `"Account is pending. Please contact support."`

#### For Buyer:

**Response:**
```json
{
  "success": false,
  "message": "Account is suspended or banned",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Account status is not `ACTIVE`
- User cannot log in until account status is changed by admin

---

### 9. Email Not Verified (Seller)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Please verify your email address before logging in. Check your email for the verification code.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Seller account exists but `emailVerified` is `false`
- Seller must verify email before logging in

---

### 10. Email Not Verified (Buyer)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Please verify your email address before logging in. Check your email for the verification code.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Buyer account exists but `emailVerified` is `false`
- Buyer must verify email before logging in

---

### 11. Staff Account Inactive

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Staff account is inactive",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Staff account exists but `isActive` is `false`
- Staff member cannot log in until account is activated

---

### 12. Generic Authentication Failed

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "success": false,
  "message": "Authentication failed",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**When it occurs:**
- Unexpected error during authentication
- Fallback error message when no specific error is available

---

## Error Response Flow Examples

### Example 1: Progressive Account Lockout

**Attempt 1 (Wrong Password):**
```json
{
  "success": false,
  "message": "Invalid credentials. You have 2 attempts remaining before your account is locked for 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Attempt 2 (Wrong Password):**
```json
{
  "success": false,
  "message": "Invalid credentials. You have 1 attempt remaining before your account is locked for 15 minutes.",
  "timestamp": "2024-01-15T12:01:00.000Z"
}
```

**Attempt 3 (Wrong Password):**
```json
{
  "success": false,
  "message": "Account locked due to 3 failed login attempts. Please try again in 15 minutes.",
  "timestamp": "2024-01-15T12:02:00.000Z"
}
```

**Attempt 4 (While Locked):**
```json
{
  "success": false,
  "message": "Account locked due to multiple failed login attempts. Please try again in 13 minutes.",
  "timestamp": "2024-01-15T12:04:00.000Z"
}
```

---

### Example 2: IP Rate Limiting

**After 5 failed attempts from same IP:**
```json
{
  "success": false,
  "message": "Too many login attempts from this device. Please try again in 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**After some time has passed:**
```json
{
  "success": false,
  "message": "Too many login attempts from this device. Please try again in 8 minutes.",
  "timestamp": "2024-01-15T12:07:00.000Z"
}
```

---

## Security Features

### Account Lockout
- **Maximum failed attempts:** 3
- **Lockout duration:** 15 minutes
- **Resets on:** Successful login or after lockout expires
- **Tracks:** Failed attempts per account

### IP Rate Limiting
- **Maximum attempts:** 5 per 15 minutes
- **Applies to:** All user types combined (prevents bypass)
- **Resets:** After 15 minutes from first attempt in window
- **Tracks:** Failed attempts per IP address

### Email Enumeration Prevention
- Generic "Invalid email or password" message when user doesn't exist
- Prevents attackers from discovering which emails are registered

---

## Error Message Priority

Errors are returned in this order of priority:

1. **Missing fields** (400 Bad Request)
2. **IP rate limit** (checked first, before user lookup)
3. **Account locked** (if account is already locked)
4. **Account status** (inactive, suspended, banned)
5. **Email verification** (for sellers and buyers)
6. **Password validation** (wrong password with attempt count)
7. **User not found** (generic message)

---

## Testing Error Responses

### Test Wrong Password (First Attempt)

```bash
curl -X POST "http://localhost:3006/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid credentials. You have 2 attempts remaining before your account is locked for 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Test Account Lockout

```bash
# Attempt 1
curl -X POST "http://localhost:3006/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong1"}'

# Attempt 2
curl -X POST "http://localhost:3006/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong2"}'

# Attempt 3 (Account will be locked)
curl -X POST "http://localhost:3006/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong3"}'
```

**Expected Response (Attempt 3):**
```json
{
  "success": false,
  "message": "Account locked due to 3 failed login attempts. Please try again in 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Test IP Rate Limiting

```bash
# Make 6 attempts from the same IP with different emails
for i in {1..6}; do
  curl -X POST "http://localhost:3006/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"test$i@example.com\", \"password\": \"wrong\"}"
done
```

**Expected Response (6th attempt):**
```json
{
  "success": false,
  "message": "Too many login attempts from this device. Please try again in 15 minutes.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## Frontend Handling Recommendations

### Display Error Messages

```javascript
async function handleLogin(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!data.success) {
      // Display error message to user
      showError(data.message);
      
      // Handle specific error types
      if (data.message.includes('locked')) {
        // Show countdown timer
        showLockoutTimer(data.message);
      } else if (data.message.includes('device')) {
        // Show IP rate limit message
        showRateLimitMessage(data.message);
      } else if (data.message.includes('verify')) {
        // Redirect to email verification page
        redirectToVerification();
      }
    } else {
      // Login successful
      handleSuccessfulLogin(data.data);
    }
  } catch (error) {
    showError('Network error. Please try again.');
  }
}
```

### Extract Remaining Time

```javascript
function extractRemainingMinutes(message) {
  const match = message.match(/(\d+)\s+minute/);
  return match ? parseInt(match[1]) : null;
}

// Usage
const message = "Account locked. Please try again in 12 minutes.";
const minutes = extractRemainingMinutes(message); // Returns 12
```

---

## Summary Table

| Error Scenario | HTTP Status | Message Pattern |
|---------------|-------------|-----------------|
| Missing fields | 400 | "Email and password are required" |
| User not found | 401 | "Invalid email or password" |
| Wrong password (1st) | 401 | "Invalid credentials. You have 2 attempts remaining..." |
| Wrong password (2nd) | 401 | "Invalid credentials. You have 1 attempt remaining..." |
| Wrong password (3rd) | 401 | "Account locked due to 3 failed login attempts..." |
| Account locked | 401 | "Account locked due to multiple failed login attempts..." |
| IP rate limit | 401 | "Too many login attempts from this device..." |
| Account inactive | 401 | "Account is inactive. Please contact support." |
| Email not verified | 401 | "Please verify your email address..." |
| Staff inactive | 401 | "Staff account is inactive" |

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
