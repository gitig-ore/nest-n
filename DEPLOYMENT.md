# IGPP Peminjaman - Vercel Deployment Guide

This document provides comprehensive instructions for deploying the IGPP Peminjaman system to Vercel.

---

## 1. Project Overview

### Description
IGPP Peminjaman is a web-based item borrowing/lending management system built with a modern full-stack architecture. It enables administrators to manage inventory and users to borrow items through a streamlined interface.

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 11.x |
| **Frontend** | Next.js 16.x (App Router) |
| **Database** | PostgreSQL with Prisma ORM |
| **Authentication** | JWT with Passport.js |
| **Styling** | Tailwind CSS |
| **Deployment** | Vercel (Serverless Functions) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐          ┌─────────────────────────────┐│
│  │   Frontend          │          │     Backend (NestJS)        ││
│  │   Next.js 16        │◄────────►│     Vercel Serverless       ││
│  │   (Port 3000)       │  API     │     Functions               ││
│  │                     │          │     (Port 3001)              ││
│  └─────────────────────┘          └─────────────────────────────┘│
│           │                                │                     │
│           │                                │                     │
│           ▼                                ▼                     │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │                    External Services                             │
│  ├─────────────────────────────────────────────────────────────────┤
│  │  ┌───────────────┐    ┌─────────────────────────────────────┐   ││
│  │  │ PostgreSQL    │    │                                     │   ││
│  │  │ (Neon/Railway)│    │    JWT Authentication Tokens         │   ││
│  │  │ Database      │    │    (Access + Refresh)                │   ││
│  │  └───────────────┘    │                                     │   ││
│  └─────────────────────────────────────────────────────────────────┘
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

Before deploying, ensure you have the following:

- **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
- **Node.js**: Version 18.x or higher
- **Git**: Installed and configured
- **PostgreSQL Database**: From Neon, Railway, Supabase, or similar
- **Terminal/Command Line**: With npm/yarn/pnpm access

### Node.js Version Check
```bash
node --version
# Should display v18.x.x or higher
```

---

## 3. Pre-Deployment Checklist

Complete all items before proceeding with deployment:

- [ ] **Environment variables configured** in Vercel Dashboard
- [ ] **Database schema migrated** to production database
- [ ] **Strong JWT secrets generated** (32+ characters)
- [ ] **CORS origins configured** with frontend URL
- [ ] **Local build tested** successfully
- [ ] **All dependencies installed** and locked

---

## 4. Environment Variables Setup

### Backend Environment Variables

Configure these in **Vercel Dashboard → Backend Project → Settings → Environment Variables**:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | ✅ Yes | JWT access token secret (32+ chars) | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | ✅ Yes | JWT refresh token secret (32+ chars) | `openssl rand -hex 32` |
| `FRONTEND_URL` | ✅ Yes | Production frontend URL | `https://your-app.vercel.app` |
| `NODE_ENV` | ✅ Yes | Environment mode | `production` |
| `PORT` | Optional | Server port (default: 3001) | `3001` |
| `LOG_LEVEL` | Optional | Logging level | `info` |

### Frontend Environment Variables

Configure these in **Vercel Dashboard → Frontend Project → Settings → Environment Variables**:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend API URL | `https://your-backend.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | Optional | Application display name | `IGPP Peminjaman` |

### Setting Environment Variables in Vercel

1. Navigate to **Vercel Dashboard**
2. Select your **Backend Project**
3. Go to **Settings → Environment Variables**
4. Add each variable:
   - Enter variable name
   - Enter value
   - Select production, preview, and development scopes
5. Click **Save**

**Repeat for Frontend Project** with frontend-specific variables.

---

## 5. Database Setup

### Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database]?sslmode=require
```

**Example (Neon):**
```
postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/igpp_db?sslmode=require
```

### Prisma Migration Steps

1. **Generate Prisma Client:**
   ```bash
   cd backend
   npx prisma generate
   ```

2. **Run Migrations on Production Database:**
   ```bash
   # Option A: Direct migration
   npx prisma migrate deploy
   
   # Option B: With connection string
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

3. **Verify Database Connection:**
   ```bash
   cd backend
   npx prisma db push
   ```

### Database Providers

| Provider | Free Tier | Setup URL |
|----------|-----------|-----------|
| **Neon** | ✅ Yes | [neon.tech](https://neon.tech) |
| **Railway** | ✅ Yes | [railway.app](https://railway.app) |
| **Supabase** | ✅ Yes | [supabase.com](https://supabase.com) |
| **AWS RDS** | ❌ No | [aws.amazon.com](https://aws.amazon.com) |

---

## 6. Step-by-Step Deployment Guide

### Option A: Deploy Backend First, Then Frontend

#### Step 1: Backend Deployment

1. **Create Vercel Project:**
   ```bash
   cd backend
   npx vercel --yes
   ```

2. **Configure Build Settings (auto-detected):**
   | Setting | Value |
   |---------|-------|
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |
   | Framework Preset | `NestJS` |
   | Region | `Singapore (sin1)` |

3. **Set Environment Variables** (as listed in Section 4)

4. **Deploy:**
   ```bash
   npx vercel --prod
   ```

5. **Note Backend URL:** `https://your-backend.vercel.app`

#### Step 2: Frontend Deployment

1. **Update `NEXT_PUBLIC_API_URL`:**
   - Go to Vercel Dashboard → Frontend Project → Settings → Environment Variables
   - Set `NEXT_PUBLIC_API_URL` to your backend URL

2. **Create Vercel Project:**
   ```bash
   cd frontend
   npx vercel --yes
   ```

3. **Configure Build Settings (auto-detected):**
   | Setting | Value |
   |---------|-------|
   | Build Command | `npm run build` |
   | Output Directory | `.next` |
   | Install Command | `npm install` |
   | Framework Preset | `Next.js` |
   | Region | `Singapore (sin1)` |

4. **Set Environment Variables** (as listed in Section 4)

5. **Deploy:**
   ```bash
   npx vercel --prod
   ```

### Option B: Deploy via Vercel Dashboard (GUI)

1. **Backend:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import from GitHub/GitLab/Bitbucket
   - Select `backend/` directory
   - Configure settings and add environment variables
   - Click **Deploy**

2. **Frontend:**
   - Repeat for `frontend/` directory
   - Add `NEXT_PUBLIC_API_URL` with backend URL
   - Click **Deploy**

---

## 7. Vercel Configuration Files

### Root `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "regions": ["sin1"],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### Backend `backend/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "nestjs",
  "regions": ["sin1"],
  "functions": {
    "backend/src/main.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/src/main.ts"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### Frontend `frontend/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 8. Custom Domains (Optional)

### Adding Custom Domain to Vercel

1. **Navigate to Project Settings:**
   - Go to Vercel Dashboard
   - Select your project
   - Click **Settings → Domains**

2. **Add Domain:**
   - Enter your custom domain (e.g., `api.igpp.com`)
   - Click **Add**

3. **Configure DNS:**

   **For apex domain (example.com):**
   | Type | Name | Value |
   |------|------|-------|
   | A | @ | 76.76.21.21 |
   | AAAA | @ | ::1 |

   **For subdomain (api.example.com):**
   | Type | Name | Value |
   |------|------|-------|
   | CNAME | api | cname.vercel-dns.com |

4. **Wait for DNS Propagation:**
   - Propagation may take 5-60 minutes
   - Use `dig your-domain.com` to verify

---

## 9. Post-Deployment Verification

### Health Check Endpoints

| Endpoint | Expected Response |
|----------|-------------------|
| `GET /` | 200 OK with welcome message |
| `GET /auth/profile` | 401 Unauthorized (without token) |

### Test Authentication Flow

1. **Login Test:**
   ```bash
   curl -X POST https://your-backend.vercel.app/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"password123"}'
   ```

2. **Test Protected Route:**
   ```bash
   curl -X GET https://your-backend.vercel.app/users \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

3. **Test CORS:**
   - Access frontend at `https://your-frontend.vercel.app`
   - Try logging in
   - Verify no CORS errors in browser console

### Database Connection Test

```bash
# In backend directory
npx prisma db push --accept-data-loss
```

---

## 10. Troubleshooting

### Common Deployment Issues

#### Build Failures

| Error | Solution |
|-------|----------|
| `Module not found` | Ensure all dependencies are in `package.json` |
| `Prisma generate failed` | Run `npx prisma generate` locally first |
| `TypeScript errors` | Fix type errors before deployment |

#### Runtime Errors

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | Check `NEXT_PUBLIC_API_URL` is correct |
| `CORS policy error` | Verify `FRONTEND_URL` in backend env vars |
| `Database connection failed` | Verify `DATABASE_URL` is correct and accessible |

#### CORS Errors

**Symptom:** 
```
Access to XMLHttpRequest at 'https://backend.vercel.app' from origin 'https://frontend.vercel.app' has been blocked by CORS policy
```

**Solution:**
1. Ensure `FRONTEND_URL` is set to frontend URL in backend environment variables
2. Redeploy backend with updated variables
3. Clear browser cache

#### JWT Token Issues

**Symptom:** Authentication fails even with valid credentials

**Solution:**
1. Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` match in backend
2. Ensure secrets are 32+ characters
3. Regenerate tokens after changing secrets

### Debug Commands

```bash
# View Vercel logs
npx vercel logs --prod

# Check build locally
cd backend && npm run build
cd frontend && npm run build

# Test Prisma connection
cd backend && npx prisma migrate status
```

---

## 11. Rollback Procedure

### Via Vercel Dashboard

1. **Navigate to Deployments:**
   - Go to Vercel Dashboard
   - Select your project
   - Click **Deployments**

2. **Select Previous Deployment:**
   - Find the working deployment
   - Click the **⋮ menu**
   - Select **Rollback**

### Via CLI

```bash
# List deployments
npx vercel list

# Rollback to specific deployment
npx vercel rollback <deployment-url>
```

---

## 12. Monitoring and Logs

### Viewing Logs

**Vercel Dashboard:**
1. Go to **Vercel Dashboard**
2. Select your project
3. Click **Deployments**
4. Click on a deployment
5. View **Logs** tab

**CLI:**
```bash
# Real-time logs
npx vercel logs --prod

# Follow logs
npx vercel logs --prod --follow
```

### Error Tracking

| Tool | Purpose | Setup |
|------|---------|-------|
| **Vercel Analytics** | Performance monitoring | Built-in |
| **Sentry** | Error tracking | `npm install @sentry/nextjs` |

### Performance Monitoring

1. **Enable Vercel Analytics:**
   - Go to Project Settings → Analytics
   - Enable **Web Vitals Tracking**

2. **Monitor Function Duration:**
   - Check deployment logs for execution time
   - Consider increasing `maxDuration` for long operations

---

## 13. Security Checklist

- [ ] Use strong JWT secrets (32+ random characters)
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS with specific origins (not `*`)
- [ ] Add rate limiting (already included)
- [ ] Use environment variables for all secrets
- [ ] Rotate JWT secrets periodically
- [ ] Enable database SSL (`?sslmode=require`)

---

## 14. Quick Reference Commands

```bash
# Generate JWT secrets
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # JWT_REFRESH_SECRET

# Backend commands
cd backend
npm install
npx prisma generate
npm run build
npx vercel --prod

# Frontend commands
cd frontend
npm install
npm run build
npx vercel --prod

# Database
npx prisma migrate deploy
npx prisma db push
```

---

## 15. Support

If you encounter issues not covered in this guide:

1. Check **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
2. Check **NestJS Documentation**: [docs.nestjs.com](https://docs.nestjs.com)
3. Check **Prisma Documentation**: [prisma.io/docs](https://prisma.io/docs)

---

**Document Version:** 1.0  
**Last Updated:** 2025-02-07  
**Compatible with:** NestJS 11.x, Next.js 16.x, Prisma 7.x
