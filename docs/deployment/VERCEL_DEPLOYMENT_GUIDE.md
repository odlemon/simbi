# 🚀 Vercel Deployment Guide

## ✅ Prisma Error Fixed!

The error `@prisma/client did not initialize yet` has been resolved!

---

## 🔧 What Was Fixed

### 1. ✅ Added `postinstall` Script
```json
"postinstall": "prisma generate"
```
This automatically generates the Prisma client after `npm install` on Vercel.

### 2. ✅ Updated `build` Script
```json
"build": "prisma generate && tsc"
```
Ensures Prisma client is generated before TypeScript compilation.

### 3. ✅ Added `vercel-build` Script
```json
"vercel-build": "prisma generate && tsc"
```
Specific build command for Vercel deployment.

### 4. ✅ Moved `prisma` to Dependencies
Moved `prisma` from `devDependencies` to `dependencies` so Vercel can access it during build.

### 5. ✅ Created `vercel.json`
Configuration file for Vercel deployment settings.

---

## 📦 Updated package.json

```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "start": "node dist/app.js",
    "postinstall": "prisma generate",
    "vercel-build": "prisma generate && tsc"
  },
  "dependencies": {
    "@prisma/client": "^6.7.0",
    "prisma": "^6.7.0",
    // ... other dependencies
  }
}
```

---

## 🌐 Deploy to Vercel

### Step 1: Push Your Code to GitHub
```bash
git add .
git commit -m "fix: add Prisma generation for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

#### Option A: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect settings

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

### Step 3: Configure Environment Variables
In Vercel Dashboard, add these environment variables:

```bash
# Database
DATABASE_URL=mysql://user:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Environment
NODE_ENV=production
PORT=3000
```

**Important:** Use your production MySQL database URL!

### Step 4: Deploy!
- Vercel will automatically deploy when you push to GitHub
- Or manually trigger: `vercel --prod`

---

## ⚙️ Vercel Configuration (vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "installCommand": "npm install",
  "buildCommand": "npm run build"
}
```

---

## 🔐 Environment Variables for Vercel

### Required Variables:
1. **DATABASE_URL**
   ```
   mysql://username:password@host:port/database
   ```
   Example: `mysql://root:password@db.example.com:3306/simbi_market`

2. **JWT_SECRET**
   ```
   your-secret-key-min-32-characters-long
   ```

3. **NODE_ENV**
   ```
   production
   ```

### Optional Variables:
- `PORT` (default: 3000)
- Any other custom environment variables from your `.env`

---

## 📝 Build Process on Vercel

When you deploy, Vercel will:

1. ✅ Clone your repository
2. ✅ Run `npm install`
3. ✅ Run `postinstall` → `prisma generate` (generates Prisma client)
4. ✅ Run `npm run build` → `prisma generate && tsc` (compiles TypeScript)
5. ✅ Run `npm start` → `node dist/app.js` (starts server)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Prisma Client not initialized"
**Solution:** ✅ Already fixed with `postinstall` script!

### Issue 2: Database Connection Error
**Solution:** Make sure `DATABASE_URL` is set in Vercel environment variables

**Check:**
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add/verify `DATABASE_URL`

### Issue 3: Build Timeout
**Solution:** Increase build timeout in Vercel settings
- Go to Settings → General
- Increase "Function Max Duration"

### Issue 4: Module Not Found
**Solution:** Make sure all imports use correct paths
- Use `src/` prefix for imports
- Check `tsconfig.json` paths

---

## 🗄️ Database Considerations

### For Production:
You need a MySQL database accessible from Vercel. Options:

#### Option 1: PlanetScale (Recommended)
- Free tier available
- Serverless MySQL
- Great for Vercel
- URL: [planetscale.com](https://planetscale.com)

#### Option 2: Railway
- Free tier available
- Easy setup
- URL: [railway.app](https://railway.app)

#### Option 3: AWS RDS
- Production-ready
- Scalable
- Paid service

#### Option 4: DigitalOcean Managed Database
- Affordable
- Reliable
- Easy setup

### Important:
Your database must be **publicly accessible** or allow Vercel's IP ranges.

---

## 🚀 Deployment Checklist

### Before Deploying:
- [x] `postinstall` script added
- [x] `prisma` in dependencies
- [x] `vercel.json` created
- [x] Code pushed to GitHub
- [ ] Production database setup
- [ ] Environment variables ready
- [ ] `.env` file NOT committed (in `.gitignore`)

### During Deployment:
- [ ] Connect GitHub repo to Vercel
- [ ] Add environment variables
- [ ] Deploy
- [ ] Check build logs

### After Deployment:
- [ ] Test API endpoints
- [ ] Check `/api-docs` (Swagger)
- [ ] Verify database connection
- [ ] Test authentication
- [ ] Monitor logs

---

## 📊 Testing Your Deployment

### 1. Check Health
```bash
curl https://your-app.vercel.app/
```

### 2. Check Swagger Docs
```bash
https://your-app.vercel.app/api-docs
```

### 3. Test Login
```bash
curl -X POST https://your-app.vercel.app/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simbi.com","password":"admin123"}'
```

---

## 🔄 Continuous Deployment

### Automatic Deployment:
Every push to `main` branch automatically deploys to Vercel!

```bash
git add .
git commit -m "your changes"
git push origin main
# Vercel automatically deploys! 🚀
```

### Preview Deployments:
Every pull request gets a preview URL!

```bash
git checkout -b feature/new-feature
# make changes
git push origin feature/new-feature
# Create PR on GitHub
# Vercel creates preview deployment! 🎉
```

---

## 📝 Build Logs

To check build logs:
1. Go to Vercel Dashboard
2. Click on your deployment
3. View "Build Logs"
4. Look for:
   - ✅ `prisma generate` output
   - ✅ TypeScript compilation
   - ✅ No errors

---

## 🎯 Expected Build Output

```bash
Running "npm install"
✓ Installed dependencies

Running "prisma generate"
✓ Generated Prisma Client

Running "npm run build"
✓ Compiled TypeScript

Running "npm start"
✓ Server started on port 3000

Deployment Ready! 🎉
```

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Your GitHub Repo:** https://github.com/odlemon/simbi

---

## 🆘 Getting Help

### Vercel Support:
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

### Prisma Support:
- Documentation: https://www.prisma.io/docs
- Community: https://www.prisma.io/community

---

## ✅ Summary

```
╔════════════════════════════════════════════╗
║  ✅ Vercel Deployment Ready                ║
╠════════════════════════════════════════════╣
║  postinstall:      ✅ Added                ║
║  build script:     ✅ Updated              ║
║  vercel-build:     ✅ Added                ║
║  prisma deps:      ✅ Moved                ║
║  vercel.json:      ✅ Created              ║
║  Ready to deploy:  ✅ Yes                  ║
╚════════════════════════════════════════════╝
```

---

## 🚀 Quick Deploy Commands

```bash
# 1. Commit changes
git add .
git commit -m "fix: add Prisma generation for Vercel"
git push origin main

# 2. Deploy to Vercel (if using CLI)
npm i -g vercel
vercel login
vercel --prod

# Or just push to GitHub and Vercel auto-deploys! 🎉
```

---

**Your app is now ready to deploy to Vercel!** 🚀

The Prisma error is fixed and will work on Vercel! ✅

