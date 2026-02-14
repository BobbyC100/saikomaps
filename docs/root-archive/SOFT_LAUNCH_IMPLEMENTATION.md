# Soft Launch Implementation — Complete

**Implemented:** February 2026

---

## What Was Implemented

### 1. Google OAuth
- **lib/auth.ts** — Added GoogleProvider to NextAuth
- **app/(auth)/login/page.tsx** — Added "Continue with Google" button and divider
- **Flow:** On first Google sign-in, creates user in DB; on subsequent sign-in, links to existing user by email

**Environment variables required:**
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Google Cloud Console setup:**
1. Create OAuth 2.0 Client ID
2. Add redirect URIs: `http://localhost:3000/api/auth/callback/google` (dev), `https://yourdomain.com/api/auth/callback/google` (prod)

---

### 2. User Profile / My Maps
- **Route:** `/profile` (authenticated, redirects to `/login` if not signed in)
- **app/profile/page.tsx** — Server component, fetches user, userMaps, savedMaps
- **app/profile/ProfilePageClient.tsx** — Client component with CuratorHeader, My Maps, Saved Maps
- **app/profile/layout.tsx** — Uses GlobalHeader and GlobalFooter
- **components/layouts/GlobalHeader.tsx** — User icon now links to `/profile` (was `/dashboard`)

**Schema changes (prisma/schema.prisma):**
- `users`: added `curator_note`, `scope_pills`, `coverage_sources`
- `saved_maps`: new model for user-saved maps
- `lists`: added `saved_maps` relation

---

### 3. Homepage Redesign
- **app/page.tsx** — Replaced with Field Notes layout
- **Hero:** "Curated maps for people who care where they go." + subhead + Explore Maps / Create a Map CTAs
- **Featured Maps:** 4-column grid of MapCards (fetches published maps from DB; fallback placeholder cards if none)
- **app/homepage.module.css** — Updated with hero, buttons, map grid, responsive breakpoints
- **components/ui/MapCard.tsx** — New reusable map card (4-up photo mosaic, title, meta, curator)

---

### 4. Explore Page
- **Status:** Existing explore page at `/explore` unchanged; uses mock data.
- **Deferred:** Connecting to real API (`/api/maps/featured` or similar) can be done later.

---

### 5. Mobile Responsiveness
- **Homepage:** Responsive breakpoints (2-col mobile → 3-col tablet → 4-col desktop)
- **Profile:** Curator header collapses on mobile; sort control hidden on small screens
- **Breakpoints:** 640px (sm), 900px (md) per spec

---

## Files Created

| File | Purpose |
|------|---------|
| `app/profile/page.tsx` | Profile server component |
| `app/profile/ProfilePageClient.tsx` | Profile client UI |
| `app/profile/layout.tsx` | Profile layout |
| `app/api/maps/featured/route.ts` | Featured maps API (optional) |
| `components/ui/MapCard.tsx` | Reusable map card |

## Files Modified

| File | Changes |
|------|---------|
| `lib/auth.ts` | GoogleProvider, signIn/jwt callbacks |
| `app/(auth)/login/page.tsx` | Google OAuth button, redirect to /profile |
| `app/page.tsx` | Full redesign |
| `app/homepage.module.css` | Hero, buttons, map grid |
| `components/layouts/GlobalHeader.tsx` | /profile link, "My Maps" title |
| `prisma/schema.prisma` | User fields, saved_maps model |

---

## Next Steps (Optional)

1. **Explore page** — Wire to real data via `/api/maps/featured` or new endpoint
2. **Profile edit** — Create `/profile/edit` for curator note, scope pills
3. **Save map** — API + UI to save/unsave maps for Saved Maps section
4. **Google OAuth** — Add env vars and test in production
