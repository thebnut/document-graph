# LifeMap - Vercel Deployment Guide

**Created:** 2025-11-23
**Status:** Ready for deployment
**Build:** ✅ Production build tested and working
**Tests:** ✅ 198 tests passing

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Phase 1: Vercel Configuration](#phase-1-vercel-configuration)
5. [Phase 2: Environment Variables](#phase-2-environment-variables)
6. [Phase 3: Google OAuth Setup](#phase-3-google-oauth-setup)
7. [Phase 4: Deployment Methods](#phase-4-deployment-methods)
8. [Phase 5: Custom Domain](#phase-5-custom-domain)
9. [Phase 6: Monitoring & Analytics](#phase-6-monitoring--analytics)
10. [Phase 7: CI/CD Pipeline](#phase-7-cicd-pipeline)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)
13. [Post-Deployment](#post-deployment)

---

## Overview

### Current Application Architecture

```
┌─────────────────────────────────────────┐
│   Vercel Edge Network (Global CDN)      │
│   - Static assets cached globally       │
│   - HTTPS/SSL automatically managed     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   React SPA (Build Output)              │
│   - Pre-rendered HTML                   │
│   - Code-split bundles (173KB gzipped)  │
│   - Service Worker (optional)           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   External Services                     │
│   - Google Drive API (storage)          │
│   - Google OAuth (auth)                 │
│   - OpenAI API (document analysis)      │
└─────────────────────────────────────────┘
```

### Why Vercel?

- ✅ **Zero Configuration** - Automatically detects Create React App
- ✅ **Global CDN** - Edge network for fast worldwide access
- ✅ **Automatic SSL** - HTTPS with Let's Encrypt
- ✅ **Preview Deployments** - Every PR gets a unique URL
- ✅ **Environment Variables** - Sensitive data management
- ✅ **Optimized for React** - Built for modern frontend frameworks
- ✅ **Free Tier** - Sufficient for personal/family use

### Bundle Size
- **Main bundle**: 173.49 kB (gzipped)
- **CSS bundle**: 6.66 kB (gzipped)
- **Total**: ~180 kB (excellent for Vercel Edge)

---

## Prerequisites

### Required Accounts
- [ ] **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
- [ ] **GitHub Account** - For repository hosting (recommended)
- [ ] **Google Cloud Project** - Already configured with Drive API
- [ ] **OpenAI Account** - For AI features (already have API key)

### Required Tools
```bash
# Install Vercel CLI
npm install -g vercel

# Verify installation
vercel --version
```

### Domain (Optional but Recommended)
- **Domain**: lifemap.au (if you own it)
- **DNS Access**: Ability to configure A/CNAME records

---

## Pre-Deployment Checklist

### Code Readiness
- [x] All tests passing (198 tests ✅)
- [x] Production build working (`npm run build` ✅)
- [x] No console errors in dev mode
- [x] TypeScript compilation successful
- [x] ESLint warnings reviewed (non-blocking)

### Security
- [ ] **CRITICAL**: Rotate all API keys before deployment
  - Google Client ID (new production key)
  - Google API Key (new production key)
  - OpenAI API Key (new production key)
- [ ] Remove exposed keys from `.env` file
- [ ] Verify `.env` is in `.gitignore`
- [ ] Review `.vercelignore` for sensitive files

### Google Cloud Configuration
- [ ] OAuth consent screen configured
- [ ] Production domains added to authorized origins
- [ ] Privacy policy URL added (or prepared)
- [ ] Terms of service URL added (or prepared)

---

## Phase 1: Vercel Configuration

### Step 1.1: Create `vercel.json`

Create this file in the project root:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "regions": ["sfo1", "syd1"],
  "github": {
    "silent": false,
    "autoAlias": true
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

**Configuration Explained:**
- `buildCommand`: Uses our custom build script with localStorage support
- `regions`: San Francisco (sfo1) for US, Sydney (syd1) for AU
- `rewrites`: SPA routing - all routes redirect to index.html
- `headers`: Security headers + aggressive caching for static assets

### Step 1.2: Create `.vercelignore`

```
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage
.nyc_output

# Production
/build

# Misc
.DS_Store
.env
.env.local
.env.development
.env.test
.env.production

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# IDEs
.vscode
.idea
*.swp
*.swo
*~

# Temporary
.tmp
.cache

# Visual testing
visual-testing/screenshots

# Git
.git
.gitignore

# Documentation (optional - can deploy these)
docs/archive
```

### Step 1.3: Update `package.json`

Add deployment scripts:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "node scripts/build.js",
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "deploy": "vercel --prod",
    "deploy:preview": "vercel",
    "vercel-build": "npm run build"
  }
}
```

**Note**: `vercel-build` is the command Vercel runs during deployment.

---

## Phase 2: Environment Variables

### Step 2.1: Identify Required Variables

Your app requires these environment variables:

```bash
# Google OAuth & Drive API
REACT_APP_GOOGLE_CLIENT_ID=<new-production-client-id>
REACT_APP_GOOGLE_API_KEY=<new-production-api-key>

# OpenAI API
REACT_APP_OPENAI_API_KEY=<new-production-openai-key>

# Optional: Domain configuration
REACT_APP_DOMAIN=lifemap.au

# Optional: API URL (future backend)
REACT_APP_API_URL=https://api.lifemap.au
```

### Step 2.2: Set Up via Vercel Dashboard

**Method A: Vercel Dashboard (Recommended for first deployment)**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project → Settings → Environment Variables
3. Add each variable with:
   - **Key**: Variable name (e.g., `REACT_APP_GOOGLE_CLIENT_ID`)
   - **Value**: The actual secret value
   - **Environment**: Select Production, Preview, or Development
   - **Sensitive**: ✅ Toggle ON for all API keys

**Important**: Use Vercel's [Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables) feature (updated Oct 2025). Once marked sensitive:
- Values are encrypted and unreadable
- Only decrypted during builds
- Cannot be viewed in dashboard after creation

### Step 2.3: Set Up via Vercel CLI

**Method B: CLI (For scripting/automation)**

```bash
# Link your local project to Vercel
vercel link

# Add sensitive environment variables
vercel env add REACT_APP_GOOGLE_CLIENT_ID production --sensitive
# Paste value when prompted

vercel env add REACT_APP_GOOGLE_API_KEY production --sensitive
# Paste value when prompted

vercel env add REACT_APP_OPENAI_API_KEY production --sensitive
# Paste value when prompted

# Add non-sensitive variables
vercel env add REACT_APP_DOMAIN production
# Enter: lifemap.au
```

**Preview Environment Variables:**

For preview deployments (PRs), use the same values but with preview-specific domain:

```bash
vercel env add REACT_APP_DOMAIN preview
# Enter: *.vercel.app
```

### Step 2.4: Local Development Environment

Keep your local `.env` file for development (not committed to git):

```bash
# .env (local only)
REACT_APP_GOOGLE_CLIENT_ID=your-dev-client-id
REACT_APP_GOOGLE_API_KEY=your-dev-api-key
REACT_APP_OPENAI_API_KEY=your-dev-openai-key
REACT_APP_DOMAIN=localhost:3000
```

**Security Reminder**: The exposed API keys in your current `.env` file should be rotated before deployment!

---

## Phase 3: Google OAuth Setup

### Step 3.1: Get New Production API Keys

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name: "LifeMap Production"

### Step 3.2: Configure Authorized JavaScript Origins

Add these origins for production and preview:

```
https://lifemap.au
https://www.lifemap.au
https://*.vercel.app
https://lifemap-git-main-yourusername.vercel.app
```

**Note**: Replace `yourusername` with your actual Vercel username/organization.

### Step 3.3: Configure Authorized Redirect URIs

```
https://lifemap.au
https://lifemap.au/
https://www.lifemap.au
https://www.lifemap.au/
https://*.vercel.app
```

### Step 3.4: OAuth Consent Screen

Update the consent screen for production:

1. Go to **OAuth consent screen**
2. **Publishing status**: Change from "Testing" to "In Production"
3. **App domain**: lifemap.au
4. **Authorized domains**: Add `lifemap.au`
5. **Privacy policy**: Add URL (create simple privacy page)
6. **Terms of service**: Add URL (optional but recommended)

**Privacy Policy Example** (create at `/privacy.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <title>LifeMap Privacy Policy</title>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p>Last updated: 2025-11-23</p>

  <h2>Data Collection</h2>
  <p>LifeMap stores your documents in your personal Google Drive account. We do not access, store, or process your documents on our servers.</p>

  <h2>Google Drive Access</h2>
  <p>We request access to your Google Drive only to:
    <ul>
      <li>Create and manage files in the "LifeMap Documents" folder</li>
      <li>Store and retrieve your document metadata</li>
    </ul>
  </p>

  <h2>OpenAI Processing</h2>
  <p>Document analysis is performed by OpenAI's API. Documents are sent to OpenAI for processing but are not stored by them.</p>

  <h2>Data Ownership</h2>
  <p>You own all your data. You can delete your LifeMap documents from your Google Drive at any time.</p>

  <h2>Contact</h2>
  <p>For questions: support@lifemap.au</p>
</body>
</html>
```

Place this in `public/privacy.html` so it deploys with your app.

### Step 3.5: Google Drive API Verification (if required)

If you exceed certain usage thresholds, Google may require app verification:

1. Submit for verification in Google Cloud Console
2. Provide privacy policy and terms
3. Explain app functionality
4. Wait for approval (can take 3-5 days)

**Note**: For personal/family use, you likely won't hit these limits.

---

## Phase 4: Deployment Methods

### Method A: GitHub Integration (Recommended)

This method provides automatic deployments, preview URLs for PRs, and deployment history.

#### Step 4.1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Create .gitignore (ensure .env is included)
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
echo "build/" >> .gitignore
echo ".tmp/" >> .gitignore

# Add files
git add .
git commit -m "chore: prepare for Vercel deployment

- Add vercel.json configuration
- Add .vercelignore
- Update package.json with deployment scripts
- Configure security headers
- Add privacy policy

Ready for production deployment to lifemap.au"

# Create GitHub repo and push
git branch -M main
git remote add origin https://github.com/yourusername/lifemap.git
git push -u origin main
```

#### Step 4.2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset**: Create React App (auto-detected)
   - **Build Command**: `npm run build` (uses our custom script)
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
5. Add environment variables (see Phase 2)
6. Click **Deploy**

#### Step 4.3: Deployment Flow

```
Developer pushes to main branch
         ↓
GitHub webhook triggers Vercel
         ↓
Vercel runs: npm install
         ↓
Vercel runs: npm run build
         ↓
Build succeeds (uses scripts/build.js)
         ↓
Deploy to production
         ↓
Global CDN distribution
         ↓
Available at: https://lifemap-*.vercel.app
```

**Preview Deployments:**
- Every PR gets a unique preview URL
- Test changes before merging
- Preview URL format: `https://lifemap-git-branch-name-yourusername.vercel.app`

### Method B: Vercel CLI (Manual)

For manual deployments or when you don't want GitHub integration:

```bash
# First deployment (interactive)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: lifemap
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod

# The first time, this creates the project
# Subsequent runs deploy updates
```

**CLI Deployment Commands:**

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy with specific settings
vercel --prod --yes --force

# View deployment logs
vercel logs <deployment-url>
```

---

## Phase 5: Custom Domain

### Step 5.1: Add Domain in Vercel

1. Go to your Vercel project
2. Settings → Domains
3. Add domain: `lifemap.au`
4. Add `www.lifemap.au` (recommended)

### Step 5.2: Configure DNS

Vercel will provide DNS instructions. Typically:

**For root domain (lifemap.au):**

```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

**For www subdomain:**

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

**Alternative: Vercel Nameservers** (if you want Vercel to manage all DNS):

Update your domain's nameservers to:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### Step 5.3: SSL Certificate

- ✅ Automatic via Let's Encrypt
- ✅ Auto-renewal (no action needed)
- ✅ HTTPS enforced by default
- ✅ HTTP → HTTPS redirect automatic

**Verification:**
- DNS propagation: 5-60 minutes
- SSL issuance: 1-5 minutes after DNS resolves
- Check status in Vercel dashboard

### Step 5.4: Domain Aliases

Set up redirects:

1. `www.lifemap.au` → `lifemap.au` (or vice versa)
2. Configure in Vercel → Domains → Redirect

**Recommended**: Redirect `www` to root domain for consistency.

---

## Phase 6: Monitoring & Analytics

### Step 6.1: Vercel Analytics

**Installation:**

```bash
npm install @vercel/analytics
```

**Integration** (`src/index.tsx`):

```typescript
import { Analytics } from '@vercel/analytics/react';

root.render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
```

**Features:**
- Page views
- Unique visitors
- Top pages
- Countries
- Devices
- Referrers

**Access**: `https://vercel.com/yourusername/lifemap/analytics`

### Step 6.2: Vercel Speed Insights

**Installation:**

```bash
npm install @vercel/speed-insights
```

**Integration** (`src/index.tsx`):

```typescript
import { SpeedInsights } from '@vercel/speed-insights/react';

root.render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
```

**Metrics tracked:**
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- FCP (First Contentful Paint)

### Step 6.3: Error Tracking with Sentry (Recommended)

**Installation:**

```bash
npm install @sentry/react
```

**Configuration** (`src/index.tsx`):

```typescript
import * as Sentry from '@sentry/react';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Remove PII from error reports
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
```

**Add Sentry DSN to environment variables:**

```bash
vercel env add REACT_APP_SENTRY_DSN production --sensitive
```

**Access**: Create account at [sentry.io](https://sentry.io)

### Step 6.4: Uptime Monitoring

**Recommended Services:**
- **Uptime Robot** - Free tier, 50 monitors
- **Better Uptime** - Beautiful status pages
- **Pingdom** - Advanced monitoring

**Setup** (Uptime Robot example):

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor:
   - Monitor Type: HTTPS
   - URL: https://lifemap.au
   - Monitoring Interval: 5 minutes
   - Alert Contacts: Your email
3. Get status page URL to share uptime

---

## Phase 7: CI/CD Pipeline

### Step 7.1: GitHub Actions Configuration

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          REACT_APP_GOOGLE_CLIENT_ID: ${{ secrets.REACT_APP_GOOGLE_CLIENT_ID }}
          REACT_APP_GOOGLE_API_KEY: ${{ secrets.REACT_APP_GOOGLE_API_KEY }}
          REACT_APP_OPENAI_API_KEY: ${{ secrets.REACT_APP_OPENAI_API_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: build/
          retention-days: 7

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Preview deployed to: ${{ steps.deploy.outputs.url }}'
            })

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Step 7.2: GitHub Secrets Configuration

Add these secrets to your GitHub repository:

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Add each secret:

```bash
# Get these from Vercel dashboard → Settings → General
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>

# Get this from Vercel dashboard → Settings → Tokens
VERCEL_TOKEN=<your-vercel-token>

# Environment variables for builds
REACT_APP_GOOGLE_CLIENT_ID=<production-client-id>
REACT_APP_GOOGLE_API_KEY=<production-api-key>
REACT_APP_OPENAI_API_KEY=<production-openai-key>
```

**To get Vercel tokens:**
1. Go to Vercel → Account Settings → Tokens
2. Create new token with scope: "Full Access"
3. Copy token immediately (shown once)

### Step 7.3: Workflow Explanation

**On Pull Request:**
1. Run tests (must pass)
2. Build application
3. Deploy to preview URL
4. Comment preview URL on PR

**On Push to Main:**
1. Run tests (must pass)
2. Build application
3. Deploy to production
4. Available at lifemap.au

---

## Security Considerations

### Step 8.1: API Key Rotation

**Before deploying to production**, rotate all API keys:

1. **Google OAuth:**
   - Create new OAuth client ID for production
   - Delete or restrict old development keys
   - Update Vercel environment variables

2. **OpenAI:**
   - Generate new API key for production
   - Set usage limits in OpenAI dashboard
   - Monitor costs regularly

3. **Environment Variables:**
   - Never commit `.env` to git
   - Use Vercel's sensitive variables feature
   - Different keys for development/production

### Step 8.2: Content Security Policy

Add CSP header to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://www.googleapis.com https://api.openai.com https://vitals.vercel-insights.com; frame-src https://accounts.google.com; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

**Explained:**
- `script-src`: Allows Google Sign-In, Vercel Analytics
- `connect-src`: Allows Google Drive API, OpenAI API, Vercel Analytics
- `frame-ancestors 'none'`: Prevents clickjacking

### Step 8.3: Rate Limiting

**OpenAI API:**
- Set monthly spending limits in OpenAI dashboard
- Implement client-side rate limiting:

```typescript
// Add to documentAnalysisService.ts
const RATE_LIMIT = {
  maxRequests: 20,
  perMinutes: 1,
};

let requestCount = 0;
let resetTime = Date.now() + 60000;

function checkRateLimit() {
  if (Date.now() > resetTime) {
    requestCount = 0;
    resetTime = Date.now() + 60000;
  }

  if (requestCount >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Please wait a moment.');
  }

  requestCount++;
}
```

### Step 8.4: Google Drive Scopes

Review and minimize scopes requested:

**Current scopes (from config):**
```typescript
scopes: [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.metadata'
]
```

**Recommendation**: Keep as-is (minimal required scopes).

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with "localStorage not found"

**Solution**: Ensure you're using the custom build script:
```json
{
  "buildCommand": "node scripts/build.js"
}
```

The custom script provides `--localstorage-file` for Node.js v25+.

---

**Issue**: "Module not found" errors

**Solution**:
1. Clear cache: `rm -rf node_modules .next .vercel`
2. Reinstall: `npm install`
3. Test locally: `npm run build`

---

**Issue**: TypeScript errors during build

**Solution**:
1. Fix all TypeScript errors locally first
2. Run `npm run build` to verify
3. Check `tsconfig.json` settings match Vercel environment

---

### Environment Variable Issues

**Issue**: Variables not available in build

**Solution**:
1. Verify variables are added to Vercel dashboard
2. Check they're assigned to the correct environment (Production/Preview)
3. Redeploy after adding variables
4. Remember: React requires `REACT_APP_` prefix

---

**Issue**: Sensitive variables showing as "hidden"

**Solution**: This is expected! Sensitive variables cannot be viewed after creation. This is a security feature.

---

### OAuth Issues

**Issue**: "Redirect URI mismatch" error

**Solution**:
1. Add exact deployment URL to Google Cloud Console
2. Include both with and without trailing slash:
   - `https://lifemap.au`
   - `https://lifemap.au/`
3. Wait 5 minutes for Google to propagate changes

---

**Issue**: "Origin not allowed"

**Solution**:
1. Add deployment domain to Authorized JavaScript Origins
2. Include all preview domains: `https://*.vercel.app`
3. Clear browser cache and cookies

---

### Performance Issues

**Issue**: Slow load times

**Solution**:
1. Check bundle size: `npm run build`
2. Analyze: `npm run build -- --stats`
3. Enable code splitting (already done via React lazy loading)
4. Verify CDN is serving files (check Network tab)

---

**Issue**: API rate limiting

**Solution**:
1. Implement request caching
2. Add debouncing to AI analysis
3. Show loading states to prevent multiple requests
4. Monitor API usage in respective dashboards

---

## Post-Deployment

### Step 10.1: Smoke Testing

After deployment, test these critical flows:

**Authentication:**
- [ ] Sign in with Google
- [ ] Token persistence (refresh page)
- [ ] Sign out

**Document Management:**
- [ ] Upload single document
- [ ] View document in viewer
- [ ] Download document

**AI Features:**
- [ ] Bulk upload documents
- [ ] AI analysis completes
- [ ] Nodes created correctly

**Graph Interaction:**
- [ ] Search functionality
- [ ] Expand/collapse nodes
- [ ] Add new node manually
- [ ] Dark/light mode toggle

**Data Persistence:**
- [ ] Changes save to Google Drive
- [ ] Refresh maintains state
- [ ] Sync status indicator works

### Step 10.2: Performance Audit

Run Lighthouse audit:

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://lifemap.au --view
```

**Target Scores:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >80

### Step 10.3: Monitoring Setup

**Daily:**
- Check error rate in Sentry
- Monitor uptime (should be >99.9%)

**Weekly:**
- Review analytics (user count, page views)
- Check API costs (OpenAI, Google Drive quotas)
- Review performance metrics

**Monthly:**
- Security audit (`npm audit`)
- Dependency updates
- Review and optimize bundle size

### Step 10.4: User Documentation

Create a simple getting started guide in `public/help.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>LifeMap - Getting Started</title>
</head>
<body>
  <h1>Getting Started with LifeMap</h1>

  <h2>1. Sign In</h2>
  <p>Click "Sign in with Google" to authenticate and connect your Google Drive.</p>

  <h2>2. Upload Documents</h2>
  <p>Use the "Bulk Upload" button to add multiple documents at once. Our AI will analyze them and place them in the right location.</p>

  <h2>3. Organize Your Graph</h2>
  <p>Drag nodes to rearrange, click to expand/collapse, and use search to find specific documents.</p>

  <h2>4. Your Data</h2>
  <p>All your documents are stored in your Google Drive in the "LifeMap Documents" folder. You own your data.</p>
</body>
</html>
```

---

## Deployment Timeline

**Estimated Time: 2-4 hours** (first deployment)

| Phase | Time | Tasks |
|-------|------|-------|
| Configuration | 30 min | Create vercel.json, .vercelignore |
| Environment Variables | 30 min | Set up in Vercel dashboard |
| Google OAuth | 45 min | Create production keys, update consent screen |
| First Deployment | 15 min | Connect GitHub or run CLI |
| Custom Domain | 30 min | Configure DNS, wait for propagation |
| Testing | 45 min | Smoke test all features |
| Monitoring | 30 min | Set up analytics, Sentry, uptime |

**Subsequent deployments: <5 minutes** (automatic via GitHub push)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing locally (198 tests)
- [ ] Production build successful (`npm run build`)
- [ ] API keys rotated (Google, OpenAI)
- [ ] `.env` not committed to git
- [ ] `vercel.json` created
- [ ] `.vercelignore` created
- [ ] Privacy policy created (`public/privacy.html`)

### Vercel Setup
- [ ] Vercel account created
- [ ] Project created (via GitHub or CLI)
- [ ] Environment variables added (all marked sensitive)
- [ ] Build command verified: `node scripts/build.js`

### Google OAuth
- [ ] New production OAuth client created
- [ ] Authorized origins added (lifemap.au, *.vercel.app)
- [ ] Redirect URIs configured
- [ ] Consent screen updated for production

### Deployment
- [ ] First deployment successful
- [ ] Deployment URL accessible
- [ ] All features working on preview URL

### Custom Domain
- [ ] Domain added in Vercel
- [ ] DNS configured (A or CNAME records)
- [ ] SSL certificate issued
- [ ] HTTPS working

### Monitoring
- [ ] Vercel Analytics installed
- [ ] Speed Insights installed
- [ ] Sentry configured (optional)
- [ ] Uptime monitoring set up

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Lighthouse audit >90
- [ ] Error monitoring active
- [ ] Documentation updated

---

## Success Criteria

Your deployment is successful when:

- ✅ Application accessible at https://lifemap.au
- ✅ HTTPS working with valid certificate
- ✅ Google Sign-In functional
- ✅ Documents upload to Google Drive
- ✅ AI analysis working
- ✅ All 198 tests passing
- ✅ Lighthouse score >90
- ✅ No console errors
- ✅ Monitoring active
- ✅ Auto-deployment working (if using GitHub)

---

## Resources

### Documentation
- [Vercel Deployment Guide](https://vercel.com/guides/deploying-react-with-vercel)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Custom Domains](https://vercel.com/docs/custom-domains)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)

### Support
- Vercel Support: https://vercel.com/support
- Vercel Community: https://github.com/vercel/vercel/discussions
- Project Documentation: [CLAUDE.md](CLAUDE.md), [context.md](context.md)

---

## Notes

- The custom build script (`scripts/build.js`) is essential for Node.js v25+ compatibility
- All sensitive environment variables should use Vercel's "Sensitive" feature
- Preview deployments are automatically created for every PR
- Production deployments happen automatically on push to `main` branch
- DNS propagation can take up to 48 hours (usually <1 hour)
- SSL certificate issuance is automatic and usually takes <5 minutes

---

**Ready to deploy?** Start with Phase 1 and work through each phase sequentially. Take your time with the Google OAuth setup as that's the most critical part.

**Good luck with your deployment! 🚀**
