---
doc_id: SAIKO-ENV-TEMPLATE
doc_type: reference
status: active
owner: Bobby Ciccaglione
created: '2026-03-10'
last_updated: '2026-03-17'
project_id: SAIKO
summary: 'Environment variable reference. Three files: .env (defaults), .env.local (secrets), .env.example (template).'
---
# Environment Variables

Saiko uses three env files. No more.

| File | Role | Gitignored |
|---|---|---|
| `.env` | Non-sensitive defaults and feature flags | Yes |
| `.env.local` | All secrets (DB, API keys, tokens). Overrides `.env`. | Yes |
| `.env.example` | Template with every variable name and comments. No values. | No |

Production secrets live in **Vercel Environment Variables** (dashboard), not in files.

---

## Setup

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Fill in your secrets (DATABASE_URL, API keys, etc.)
#    See .env.example for the full list with comments.

# 3. Run
npm run dev
```

---

## Variable Reference

### Database
| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | `.env.local` | Neon pooler endpoint. `postgresql://...@...-pooler...neon.tech/neondb` |
| `DB_ENV` | `.env.local` | `dev` or `prod` |

### Auth
| Variable | Where | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | `.env.local` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `.env` | `http://localhost:3000` (default) |
| `ADMIN_EMAILS` | `.env.local` | Comma-separated admin allowlist |

### AI
| Variable | Where | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` | Claude API key |

### Rate Limiting
| Variable | Where | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | `.env.local` | From Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | `.env.local` | From Upstash dashboard |

### Storage (Cloudflare R2)
| Variable | Where | Notes |
|---|---|---|
| `R2_ACCESS_KEY_ID` | `.env.local` | R2 auth |
| `R2_SECRET_ACCESS_KEY` | `.env.local` | R2 auth |
| `R2_ENDPOINT` | `.env.local` | `https://<account>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | `.env` | `saiko-assets` (not secret) |

### Google
| Variable | Where | Notes |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | `.env.local` | Backend Places API |
| `GOOGLE_PLACES_ENABLED` | `.env` | `false` by default (cost control) |
| `GOOGLE_OAUTH_CLIENT_ID` | `.env.local` | Google Docs sync |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `.env.local` | Google Docs sync |

### Error Tracking (Sentry)
| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` | Client-side Sentry DSN |
| `SENTRY_DSN` | `.env.local` | Server-side (same value) |

### Feature Flags
| Variable | Where | Notes |
|---|---|---|
| `GOOGLE_PLACES_ENABLED` | `.env` | `false` = no Places API calls |
| `DEBUG_ROUTES_ENABLED` | `.env` | `false` = debug endpoints return 404 |
| `AUTH_DEBUG` | `.env.local` | `true` = verbose auth logging (dev only) |

---

## Load Order

Next.js loads `.env` first, then `.env.local` (overrides). The `scripts/load-env.js` loader follows the same pattern. Wrapper scripts (`db-neon.sh`, `db-local.sh`) set `DATABASE_URL` before loading, so their value wins.
