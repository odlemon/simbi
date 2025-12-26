# Lockout Reset Scripts

## Scripts Available

### 1. `reset-ip-lockout.js` - Reset Specific IP
Resets failed login attempts for a specific IP address and all account lockouts.

**Usage:**
```bash
# Reset for default IP (::1 - localhost)
node reset-ip-lockout.js

# Reset for specific IP
node reset-ip-lockout.js 192.168.1.100
```

**What it does:**
- Deletes all `failed_login_attempts` records for the specified IP
- Resets account-level lockouts (failedLoginAttempts = 0, accountLockedUntil = NULL) for all locked accounts

### 2. `reset-all-lockouts.js` - Reset Everything
Resets ALL failed login attempts and ALL account lockouts across the entire system.

**Usage:**
```bash
node reset-all-lockouts.js
```

**What it does:**
- Deletes ALL `failed_login_attempts` records (all IPs)
- Resets ALL account-level lockouts for all user types

## Testing Workflow

1. **Test IP Lockout (5 attempts):**
   ```bash
   # Make 5 failed login attempts from your IP
   # You should see: "Too many login attempts from this IP address..."
   
   # Reset to test again
   node reset-ip-lockout.js
   ```

2. **Test Account Lockout (3 attempts on same account):**
   ```bash
   # Make 3 failed login attempts on the same account
   # You should see: "Account locked due to 3 failed login attempts..."
   
   # Reset to test again
   node reset-ip-lockout.js
   ```

3. **Test Both:**
   ```bash
   # Make 2 failed attempts on account A
   # Make 2 failed attempts on account B  
   # Make 1 failed attempt on account C
   # Total: 5 attempts from same IP → IP blocked
   
   # Reset to test again
   node reset-ip-lockout.js
   ```

## Finding Your IP Address

Your IP is usually:
- `::1` or `127.0.0.1` for localhost
- Check your server logs to see what IP is being recorded
- Or check the `failed_login_attempts` table:
  ```sql
  SELECT DISTINCT ipAddress FROM failed_login_attempts;
  ```

## Quick Commands

```bash
# Reset your current IP (localhost)
cd database_migrations
node reset-ip-lockout.js

# Reset specific IP
node reset-ip-lockout.js YOUR_IP_ADDRESS

# Reset everything (nuclear option)
node reset-all-lockouts.js
```











