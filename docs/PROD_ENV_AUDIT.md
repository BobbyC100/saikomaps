# Production Environment Variables Audit

**Date:** 2026-02-15  
**Status:** ⚠️ IN PROGRESS  

## Required Environment Variables

### Core Application

- [x] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NODE_ENV=production` - Required for production builds
- [ ] `NEXTAUTH_SECRET` - Session secret for NextAuth ⚠️ **MISSING FROM .env.local**

### Storage (Cloudflare R2)

- [x] `R2_ENDPOINT` - Cloudflare R2 endpoint URL
- [x] `R2_ACCESS_KEY_ID` - R2 access key
- [x] `R2_SECRET_ACCESS_KEY` - R2 secret key
- [x] `R2_BUCKET_NAME` - R2 bucket name

### External APIs

- [x] `ANTHROPIC_API_KEY` - For AI-powered place descriptors
- [ ] `GOOGLE_PLACES_API_KEY` - Google Places API (optional for imports) ⚠️ Set to placeholder
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For client-side Google Maps ⚠️ **CRITICAL**
- [ ] `GOOGLE_PLACES_ENABLED` - Feature flag (default: false)

### Admin Features (Optional)

- [x] `ADMIN_EMAILS` - Comma-separated list of admin emails

## Current Status

### ✅ Available in Local Environment
- DATABASE_URL
- R2_* (all 4 variables)
- ANTHROPIC_API_KEY
- ADMIN_EMAILS

### ⚠️ Missing or Placeholder
1. **NEXTAUTH_SECRET** - Not present in .env.local
   - Used by: `/lib/auth.ts`
   - Impact: Auth sessions will fail
   - Action: Generate secure secret for production

2. **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** - Set to placeholder "your_api_key_here"
   - Used by: Map components, photo URLs
   - Impact: Maps and photos won't load
   - Action: Add valid Google Maps API key

3. **GOOGLE_PLACES_API_KEY** - Same placeholder
   - Used by: Import scripts, enrichment pipelines
   - Impact: Data imports will fail
   - Note: Optional if not running imports in prod

## Next Steps

1. ⏳ Run local production build test
2. ⏳ Verify which features require Google Maps API
3. ⏳ Generate NEXTAUTH_SECRET for production
4. ⏳ Confirm staging/production env var configuration
5. ⏳ Test database connectivity from production environment
