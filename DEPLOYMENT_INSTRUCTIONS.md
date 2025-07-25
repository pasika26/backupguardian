# BackupGuardian Deployment Instructions

## Full Deployment Process

Follow these steps in order after making any code changes:

---

## 1. UPDATE GITHUB

### Basic Push
```bash
# Check what files have changed
git status

# Add all changed files
git add .

# Commit with descriptive message
git commit -m "Describe your changes here"

# Push to GitHub
git push origin main
```

### If Permission Issues
```bash
# Option 1: Re-authenticate
git remote set-url origin https://YOUR_USERNAME@github.com/pasika26/backupguardian.git
git push origin main

# Option 2: Use SSH (if SSH key configured)
git remote set-url origin git@github.com:pasika26/backupguardian.git
git push origin main

# Option 3: Use GitHub CLI
gh auth login
git push origin main
```

---

## 2. UPDATE RAILWAY BACKEND

### Environment Variables (Set Once)
Go to Railway Dashboard → Your Project → `backupguardian` service → Variables tab:

```bash
NODE_ENV=production
PORT=8080
JWT_SECRET=your-long-secure-random-string-here
FRONTEND_URL=https://www.backupguardian.org
DATABASE_URL=postgresql://[railway-auto-provides-this]
REDIS_URL=redis://[railway-auto-provides-this]
```

### Deploy Backend
```bash
# From project root directory
railway up

# Or if that fails, try:
cd backend
railway up

# Check deployment status
railway status

# View logs (if issues)
railway logs
```

### Test Backend Health
```bash
# Should return JSON with status "healthy"
curl https://backupguardian-production.up.railway.app/health
```

---

## 3. UPDATE VERCEL FRONTEND

### Environment Variables (Set Once)
Go to Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
VITE_API_URL=https://backupguardian-production.up.railway.app
VITE_APP_NAME=Backup Guardian
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

### Deploy Frontend
```bash
# Go to frontend directory
cd frontend

# Deploy to production
vercel --prod

# If login issues:
vercel login
vercel --prod
```

### Test Frontend
Visit: https://www.backupguardian.org

---

## 4. VERIFICATION CHECKLIST

After deployment, test these features:

### ✅ Frontend Tests
- [ ] Landing page loads properly
- [ ] Login/Register forms work
- [ ] No console errors in browser
- [ ] Privacy Policy and Terms load

### ✅ Backend Tests  
- [ ] Health endpoint: `curl https://backupguardian-production.up.railway.app/health`
- [ ] Registration works from frontend
- [ ] Login works from frontend
- [ ] No 404 or 500 errors

### ✅ Full Integration Tests
- [ ] Create new account
- [ ] Upload a backup file (small .sql file)
- [ ] Validation runs successfully  
- [ ] Download PDF/JSON reports work
- [ ] View test history

---

## COMMON ISSUES & FIXES

### "Failed to fetch" Errors
**Problem:** Frontend can't reach backend
**Fix:**
1. Check Railway backend is running: `railway status`
2. Verify CORS settings in backend include Vercel URL
3. Check environment variables on both platforms

### 404 Errors on API Calls
**Problem:** Backend routes not working
**Fix:**
1. Verify Railway deployment succeeded
2. Check backend logs: `railway logs`
3. Ensure all environment variables are set

### Login/Register Not Working
**Problem:** Database connection or JWT issues
**Fix:**
1. Check DATABASE_URL environment variable on Railway
2. Verify JWT_SECRET is set
3. Check backend logs for database errors

### File Upload Fails
**Problem:** Upload endpoint or storage issues
**Fix:**
1. Check file size (<100MB)
2. Verify multer middleware working
3. Check Railway storage permissions

---

## QUICK COMMANDS REFERENCE

```bash
# Full deployment sequence
git add . && git commit -m "Your changes" && git push origin main
railway up
cd frontend && vercel --prod

# Check everything is working
curl https://backupguardian-production.up.railway.app/health
curl -I https://www.backupguardian.org

# View logs if issues
railway logs
vercel logs backupguardian
```

---

## ENVIRONMENT URLS

- **Production Frontend:** https://www.backupguardian.org
- **Production Backend:** https://backupguardian-production.up.railway.app  
- **Custom Domain:** https://backupguardian.org (when DNS configured)
- **GitHub Repository:** https://github.com/pasika26/backupguardian
- **Railway Dashboard:** https://railway.app
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## CONTACT & SUPPORT

- **Primary Email:** hello@backupguardian.org
- **GitHub Issues:** https://github.com/pasika26/backupguardian/issues
- **Railway Support:** https://help.railway.app
- **Vercel Support:** https://vercel.com/help

---

**Last Updated:** January 7, 2025  
**Next Review:** After first major deployment
