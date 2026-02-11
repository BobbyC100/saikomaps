# User Profiles — Build Handoff

**Purpose:** Get ready for building user profiles in Saiko Maps.  
**Last updated:** February 10, 2026

---

## Current State Summary

### Auth & Users

- **Auth:** NextAuth.js with JWT strategy, credentials provider
- **Session:** `getServerSession(authOptions)` in API routes, `useSession()` in client
- **User model:** `users` table (Prisma schema lines 266–280)

```
users:
  id, email, name, password_hash, avatar_url, subscription_tier, created_at, updated_at
  Relations: import_jobs, lists, viewer_bookmarks
```

- **Session user shape:** `{ id, email, name }` (see `types/next-auth.d.ts`)

### Key Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | NextAuth config, credentials provider, JWT/session callbacks |
| `app/api/auth/[...nextauth]/route.ts` | Auth API handler |
| `app/api/auth/signup/route.ts` | Sign up |
| `app/(auth)/login/page.tsx` | Login UI |
| `app/(auth)/signup/page.tsx` | Sign up UI |
| `types/next-auth.d.ts` | Session/User type extensions |
| `components/providers/SessionProvider.tsx` | Wraps app with `NextAuthSessionProvider` |

### Nav & Dashboard

- **Logged-in nav:** `GlobalHeader` shows Create + User icon → `/dashboard`
- **Dashboard:** `app/(creator)/dashboard/page.tsx` — lists user’s maps, quick actions

### User-Related Data

- **lists** — `user_id` FK → user’s maps/field notes
- **viewer_bookmarks** — `viewer_user_id` FK → user’s saved places
- **import_jobs** — `user_id` FK → import history

---

## What “User Profiles” Could Include

1. **Profile page** — `/profile` or `/dashboard/profile` for own profile
2. **Public profile** — `/u/[username]` or `/profile/[id]` for others
3. **Profile fields** — bio, avatar, display name, location, preferences
4. **Profile editing** — update name, avatar, bio
5. **Profile stats** — maps count, bookmarks count, member since

---

## Schema Changes to Consider

Current `users` model:

```prisma
model users {
  id                String             @id
  email             String             @unique
  name              String?
  password_hash     String?
  avatar_url        String?
  subscription_tier String             @default("free")
  created_at        DateTime           @default(now())
  updated_at        DateTime
  // relations...
}
```

Possible additions (depending on scope):

- `username` / `slug` — for public URLs
- `bio` — short bio
- `location` — city/neighborhood
- `website` — personal site
- `pronouns` — optional
- `preferences` — JSON for UI prefs

---

## Prisma Client Note

- The schema uses `users` and `lists` (snake_case).
- The generated Prisma client exposes `db.users` and `db.lists`.
- Some code uses `db.user` and `db.list` (e.g. `lib/auth.ts`, `app/api/auth/signup/route.ts`, `app/api/maps/route.ts`).

If auth/maps APIs fail with “property does not exist,” switch to `db.users` and `db.lists` and fix any field casing (e.g. `password_hash` vs `passwordHash` if a `@map` is used).

---

## Suggested First Steps

1. **Decide scope** — own profile only vs public profiles.
2. **Schema** — add any new fields and run migration.
3. **Profile page** — `/profile` or `/dashboard/profile` for current user.
4. **API** — `GET /api/profile` (own), `PATCH /api/profile` (update).
5. **Profile edit** — form to update name, avatar, bio, etc.
6. **Nav** — point User icon to profile or dropdown (Dashboard / Profile / Sign Out).

---

## Quick Reference

- **Session check:** `const session = await getServerSession(authOptions)`
- **User ID:** `session?.user?.id`
- **Dev fallback:** `demo-user-id` when `NODE_ENV=development` and no session

---

## Related Docs

- `PLATINUM_PROFILE_ANALYSIS.md` — Place data completeness (not user profiles)
- `MAP_CREATION_FLOW.md` — Maps/lists flow
- `FIX_CREATE_MAP.md` — Map creation details
