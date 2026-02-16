# Vercel Deployment Checklist for Saiko Maps

## Prerequisites
- [x] Next.js 16 app configured
- [x] GitHub repository connected
- [ ] PostgreSQL production database ready
- [ ] Environment variables prepared

## Environment Variables Needed on Vercel

Based on your `.env.example`, you'll need to set these in Vercel dashboard:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Google Places API (Optional - disabled by default)
GOOGLE_PLACES_ENABLED=false
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

# Cloudflare R2 Storage (If using image uploads)
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_ENDPOINT=your_endpoint
R2_BUCKET_NAME=your_bucket
```

## Database Options

1. **Vercel Postgres** (easiest integration)
   - Navigate to your project on Vercel
   - Go to Storage tab
   - Create Postgres database
   - Vercel automatically sets `DATABASE_URL`

2. **Neon** (serverless Postgres)
   - Sign up at neon.tech
   - Create a project
   - Copy connection string
   - Add to Vercel environment variables

3. **Supabase**
   - Sign up at supabase.com
   - Create a project
   - Get connection string from settings
   - Add to Vercel environment variables

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended for first time)

1. Go to https://vercel.com/new
2. Import your GitHub repository: `https://github.com/BobbyC100/saikomaps`
3. Configure project:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-detected)
4. Add environment variables (see above)
5. Click "Deploy"

### Option 2: Deploy via CLI

1. Login to Vercel:
   ```bash
   npx vercel login
   ```

2. Deploy (from project root):
   ```bash
   npx vercel
   ```

3. Follow prompts:
   - Set up and deploy? Yes
   - Which scope? Your account
   - Link to existing project? No (first time)
   - Project name? saiko-maps
   - Directory? ./
   - Override settings? No

4. Add environment variables:
   ```bash
   npx vercel env add DATABASE_URL production
   npx vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
   # ... add other vars as needed
   ```

5. Deploy to production:
   ```bash
   npx vercel --prod
   ```

## Post-Deployment Steps

1. **Run Prisma migrations** on production database:
   ```bash
   # After database is set up, run migrations
   npx prisma migrate deploy
   ```

2. **Verify deployment**:
   - Check build logs on Vercel dashboard
   - Visit your production URL
   - Test basic functionality

3. **Set up continuous deployment**:
   - By default, Vercel auto-deploys on push to main branch
   - Configure branch settings if needed

## Build Configuration

Your `package.json` already has the correct build script:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

## Prisma Considerations

Your app uses Prisma with PostgreSQL. Vercel will automatically:
- Install dependencies during build
- Run `prisma generate` if you add it to `postinstall` script

Recommended: Add this to your `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## Common Issues

1. **Build fails with Prisma error**: Make sure `DATABASE_URL` is set in environment variables
2. **Runtime error connecting to database**: Check that your production database allows connections from Vercel's IP ranges
3. **Missing environment variables**: Double-check all required vars are set in Vercel dashboard

## Next Steps

1. Commit and push your current changes
2. Set up production database
3. Deploy to Vercel
4. Configure environment variables
5. Test deployment
