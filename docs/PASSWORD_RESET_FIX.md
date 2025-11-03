# Password Reset Fix Instructions

## Issues Found

1. **Seller Update Error**: Database migration not run - `passwordResetToken` and `passwordResetExpires` fields don't exist in database
2. **Email Not Received**: Email service might be failing silently

---

## 🔧 Fix Steps

### Step 1: Run Database Migration

The schema has been updated but the migration hasn't been run yet. You need to create and apply the migration:

```bash
# Create migration for password reset fields
npx prisma migrate dev --name add_password_reset_tokens

# This will:
# 1. Create migration SQL file
# 2. Apply it to your database
# 3. Regenerate Prisma client
```

**What this migration does:**
- Adds `passwordResetToken` field to `buyers` table
- Adds `passwordResetExpires` field to `buyers` table  
- Adds `passwordResetToken` field to `sellers` table
- Adds `passwordResetExpires` field to `sellers` table

### Step 2: Regenerate Prisma Client

After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

### Step 3: Restart Your Server

**Important:** You must restart your server after running migrations:

```bash
# Stop your server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 📧 Email Not Received - Troubleshooting

### Check Email Service Logs

The email service logs whether emails were sent successfully. Check your server logs for:

```
✅ Success: "Email sent successfully"
❌ Failure: "Failed to send email"
```

### Verify Email Configuration

Check that your ZeptoMail credentials are correct in your environment or `.env` file. The EmailService uses:
- `Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==`

### Check FRONTEND_URL Environment Variable

The reset link uses `FRONTEND_URL` environment variable. Make sure it's set:

```env
FRONTEND_URL=http://localhost:3000
# or
FRONTEND_URL=https://simbi-buyer.vercel.app
```

### Test Email Sending

You can test if emails are working by checking the email service directly. The service returns `true` if email was sent successfully, `false` otherwise.

---

## 🔍 Debugging

### Check Database Fields Exist

After running migration, verify fields exist:

```sql
-- Check buyers table
DESCRIBE buyers;
-- Should show: passwordResetToken, passwordResetExpires

-- Check sellers table  
DESCRIBE sellers;
-- Should show: passwordResetToken, passwordResetExpires
```

### Check Server Logs

Look for these log messages:
- `Password reset email sent to buyer` - ✅ Email sent
- `Failed to send password reset email to buyer` - ❌ Email failed
- `Password reset requested for non-existent email` - Email doesn't exist

### Verify Token Generation

The reset token is a 64-character hex string (32 bytes). Check that it's being generated:
- Should be 64 characters long
- Should be stored in database
- Should be included in email link

---

## ✅ After Migration

Once migration is complete, the endpoints will work:

### Test Forgot Password
```bash
POST /api/auth/forgot-password
{
  "email": "buyer@example.com"
}
```

### Test Reset Password
```bash
POST /api/auth/reset-password
{
  "token": "token-from-email",
  "newPassword": "NewPassword123!"
}
```

---

## ⚠️ Important Notes

1. **Always restart server after migrations** - Prisma client needs to be regenerated
2. **Check email service logs** - Emails might be failing silently
3. **Verify FRONTEND_URL is set** - Required for reset links
4. **Token expires in 1 hour** - User must reset within 1 hour

