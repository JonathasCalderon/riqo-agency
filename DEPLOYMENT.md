# Deployment Guide for Riqo Agency

## Deploying to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free)
- Domain `riqo.agency` DNS access

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your `riqo-agency` repository
5. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"

### Step 3: Configure Custom Domain
1. In Vercel dashboard, go to your project
2. Go to "Settings" → "Domains"
3. Add `riqo.agency`
4. Add `www.riqo.agency` (optional)
5. Update your domain's DNS records:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → `76.76.19.61`

### Step 4: Environment Variables
In Vercel dashboard:
1. Go to "Settings" → "Environment Variables"
2. Add your Supabase credentials
3. Redeploy the project

## Alternative: Netlify Deployment

### Step 1: Build Settings
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: 18.x

### Step 2: Environment Variables
Add the same Supabase environment variables in Netlify dashboard.

## Domain Configuration

### DNS Records for riqo.agency
```
Type    Name    Value
A       @       76.76.19.61 (Vercel)
CNAME   www     cname.vercel-dns.com
```

### SSL Certificate
Both Vercel and Netlify provide automatic SSL certificates for custom domains.

## Post-Deployment Checklist
- [ ] Test all pages load correctly
- [ ] Verify authentication works
- [ ] Test file upload functionality
- [ ] Check both English and Spanish versions
- [ ] Verify custom domain works
- [ ] Test contact form submissions
