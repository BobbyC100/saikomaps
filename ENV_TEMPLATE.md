# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/saikomaps?schema=public"

# Google Places API (server-side: search, place details, photos)
GOOGLE_PLACES_API_KEY="your_google_places_api_key_here"

# Google Maps JavaScript API (client-side: map on /map/[slug])
# Enable "Maps JavaScript API" in Google Cloud Console. Can be same key if both APIs are enabled.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# Anthropic (for AI-generated map descriptions)
ANTHROPIC_API_KEY="your_anthropic_api_key_here"

# AWS S3 (for image storage)
AWS_S3_BUCKET="saikomaps-prod"
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
CLOUDFRONT_URL="https://your-cloudfront-url.cloudfront.net"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="generate_a_random_secret_here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Use Clerk instead
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_key"
# CLERK_SECRET_KEY="your_clerk_secret"
```

## Quick Setup for Development

For local development with Supabase:
1. Sign up at https://supabase.com
2. Create a new project
3. Copy the `DATABASE_URL` from Settings > Database
4. Add your Google Places API key from Google Cloud Console


