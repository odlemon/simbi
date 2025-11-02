# 🚨 Prisma Drift: Causes & Solutions

## What is Prisma Drift?

**Drift** occurs when your database schema doesn't match your Prisma migration history. This means Prisma thinks your database should be in one state, but it's actually in a different state.

---

## 🔍 How to Detect Drift

### **Command to Check for Drift:**
```bash
npx prisma migrate status
```

**Output if drift detected:**
```
⚠️  Drift detected: Your database schema is not in sync with your migration history.
```

### **Visual Indicators:**
- Prisma shows warnings when running migrations
- `prisma migrate dev` shows drift warnings
- Database schema differs from `schema.prisma`

---

## ❌ Common Causes of Drift

### **1. Manual Database Changes**
**Problem:** Someone manually altered the database (added columns, changed types, etc.)

```sql
-- Example of manual change that causes drift
ALTER TABLE `buyers` ADD COLUMN `manual_column` VARCHAR(255);
```

**Why it causes drift:**
- Prisma doesn't know about this change
- Migration history doesn't include it
- Schema becomes out of sync

---

### **2. Using `prisma db push` Instead of Migrations**
**Problem:** Using `db push` in development, then switching to migrations

```bash
# This can cause drift
npx prisma db push
```

**Why it causes drift:**
- `db push` doesn't create migration files
- No record in migration history
- When you later use `migrate dev`, Prisma sees differences

---

### **3. Deleted or Modified Migration Files**
**Problem:** Migration files were deleted or modified after they were applied

```bash
# Someone deleted migration files
rm -rf prisma/migrations/20251031000000_*
```

**Why it causes drift:**
- Migration history is incomplete
- Prisma can't reconcile the state

---

### **4. Prisma Schema Changed Without Migrations**
**Problem:** `schema.prisma` was updated but no migration was created

```prisma
// Schema changed
model Buyer {
  emailVerified Boolean @default(false)  // Added this
}
```

```bash
# But no migration created
# Missing: npx prisma migrate dev --name add_email_verification
```

**Why it causes drift:**
- Schema expects changes that don't exist in database
- No migration file created
- History doesn't reflect changes

---

### **5. Database Reset/Restore**
**Problem:** Database was reset or restored from a backup

```bash
# Database reset without updating migrations
# Or restored from an old backup
```

**Why it causes drift:**
- Database state doesn't match migration history
- Migration table (`_prisma_migrations`) is missing or outdated

---

### **6. Branch Conflicts**
**Problem:** Merged branches with conflicting migrations

```bash
# Branch A created migration 001
# Branch B created migration 002
# Merge conflicts or out-of-order migrations
```

**Why it causes drift:**
- Migration order is wrong
- Some migrations missing
- Conflicts in migration history

---

### **7. Production Direct Changes**
**Problem:** Emergency fixes applied directly to production database

```sql
-- Emergency fix in production
ALTER TABLE `orders` ADD INDEX `idx_status` (`status`);
```

**Why it causes drift:**
- Production has changes not in migrations
- Development/staging environments differ
- Can't reproduce production state

---

## ✅ How to Avoid Drift (Best Practices)

### **1. Always Use Migrations**
**✅ DO:**
```bash
# Make schema changes
# Edit schema.prisma

# Create and apply migration
npx prisma migrate dev --name descriptive_name
```

**❌ DON'T:**
```bash
# Don't use db push in shared environments
npx prisma db push  # Avoid in production/staging
```

---

### **2. Never Modify Applied Migrations**
**✅ DO:**
- Keep all migration files in version control
- Create new migrations for changes

**❌ DON'T:**
- Delete migration files
- Modify existing migration files
- Edit the `_prisma_migrations` table directly

---

### **3. Use `db push` Only for Prototyping**
**✅ Safe Use:**
```bash
# Only in local development for quick prototyping
npx prisma db push

# Then create proper migration
npx prisma migrate dev --name proper_migration
```

**❌ Unsafe:**
- Never use `db push` in production
- Never use `db push` in shared development databases
- Never use `db push` if you plan to use migrations later

---

### **4. Version Control Migrations**
**✅ DO:**
- Commit all migration files
- Don't modify committed migrations
- Review migrations before merging

**❌ DON'T:**
- Force push migrations
- Delete migration history
- Merge conflicting migrations without review

---

### **5. Sync Schema with Database**
**✅ DO:**
```bash
# After schema changes, always create migration
npx prisma migrate dev --name add_feature

# Or for production
npx prisma migrate deploy
```

**❌ DON'T:**
```bash
# Don't skip migration creation
# Don't manually edit database
# Don't ignore Prisma warnings
```

---

### **6. Use Migration Status Checks**
**✅ DO:**
```bash
# Regularly check migration status
npx prisma migrate status

# Add to CI/CD pipeline
npx prisma migrate deploy --dry-run
```

---

### **7. Document Manual Changes**
**✅ DO:**
- If manual change is absolutely necessary:
  1. Document it
  2. Create migration immediately after
  3. Test the migration

```bash
# Manual change applied
ALTER TABLE `users` ADD COLUMN `legacy_field` VARCHAR(255);

# Immediately create migration
npx prisma db pull  # Pull current state
npx prisma migrate dev --name add_legacy_field
```

---

## 🔧 How to Fix Drift

### **Option 1: Reset and Reapply Migrations (Development Only)**

⚠️ **WARNING: This will delete all data!**

```bash
# Reset database and apply all migrations
npx prisma migrate reset

# This will:
# 1. Drop database
# 2. Create database
# 3. Apply all migrations
# 4. Run seed script (if configured)
```

---

### **Option 2: Create Baseline Migration**

If you've made manual changes, baseline the current state:

```bash
# Pull current database state
npx prisma db pull

# Create a baseline migration
npx prisma migrate dev --name baseline --create-only

# Edit the migration file to be empty or mark as applied
# Then mark it as applied
npx prisma migrate resolve --applied baseline
```

---

### **Option 3: Mark Missing Migrations as Applied**

If migrations exist but weren't applied:

```bash
# Check migration status
npx prisma migrate status

# Mark specific migration as applied (if changes already in DB)
npx prisma migrate resolve --applied 20251031000000_add_email_verification

# Then continue with new migrations
npx prisma migrate dev
```

---

### **Option 4: Create Missing Migration**

If schema changed but no migration created:

```bash
# Generate migration from current schema
npx prisma migrate dev --name sync_schema

# This will create migration for differences
```

---

### **Option 5: Manual Reconciliation**

For complex drift situations:

```bash
# 1. Check current state
npx prisma migrate status

# 2. Pull database state
npx prisma db pull

# 3. Compare with schema.prisma
# 4. Manually create migration file
# 5. Apply migration
npx prisma migrate deploy
```

---

## 📋 Recommended Workflow

### **Development Workflow:**

```bash
# 1. Make schema changes
# Edit prisma/schema.prisma

# 2. Create and apply migration
npx prisma migrate dev --name add_feature

# 3. Verify status
npx prisma migrate status

# 4. Commit migration files
git add prisma/migrations/
git commit -m "Add email verification fields"
```

### **Production Workflow:**

```bash
# 1. Test migrations locally
npx prisma migrate deploy --dry-run

# 2. Deploy migrations
npx prisma migrate deploy

# 3. Verify status
npx prisma migrate status
```

---

## 🚨 Emergency Fixes

### **If Drift is Detected in Production:**

**Option 1: Create Baseline (Safest)**
```bash
# 1. Document current production state
npx prisma db pull  # Save to temp schema file

# 2. Create baseline migration
npx prisma migrate dev --name production_baseline --create-only

# 3. Mark as applied (don't actually run it)
npx prisma migrate resolve --applied production_baseline

# 4. Continue with new migrations
```

**Option 2: Force Reset (Dangerous - Data Loss!)**
```bash
# Only if you can afford to lose data
npx prisma migrate reset
```

---

## 📝 Checklist: Preventing Drift

- [ ] Always use `prisma migrate dev` for schema changes
- [ ] Never modify applied migration files
- [ ] Commit all migration files to version control
- [ ] Use `prisma migrate status` regularly
- [ ] Avoid `prisma db push` in shared environments
- [ ] Review migrations before merging branches
- [ ] Test migrations in staging before production
- [ ] Document any manual database changes
- [ ] Create migrations immediately after manual changes
- [ ] Use `prisma migrate deploy` in production (not `db push`)

---

## 🎯 For Your Current Situation

Since you just added email verification fields, here's the safe fix:

```bash
# 1. Check current status
npx prisma migrate status

# 2. If drift detected, create migration for new fields
npx prisma migrate dev --name add_email_verification

# 3. This will:
#    - Create migration file with your new fields
#    - Apply it to database
#    - Update migration history

# 4. Verify
npx prisma migrate status
```

If the fields already exist in the database (from `db push`), you can:

```bash
# Option A: Create migration and mark as applied
npx prisma migrate dev --name add_email_verification --create-only
npx prisma migrate resolve --applied add_email_verification

# Option B: Reset and start fresh (development only!)
npx prisma migrate reset
```

---

**Last Updated:** October 31, 2025  
**Related:** `prisma migrate`, `prisma db push`, Migration Best Practices


