---
doc_id: ARCHITECTURE-INSTAGRAM-API-INTEGRATION-V1
doc_type: architecture
status: active
owner: Bobby Ciccaglione
created: '2026-03-13'
last_updated: '2026-03-13'
project_id: SAIKO
summary: >-
  Instagram Graph API integration state — Meta app config, permissions, verified
  endpoints, architectural models for media ingestion
---
# Instagram API Integration — Current State

## Objective

Enable Saiko to access Instagram media via the official Instagram Graph API to support potential ingestion of media signals for places, merchants, and editorial surfaces.

This work establishes the first authenticated API connection between the Saiko system and Instagram.

## Current Status: Operational

The following capabilities are now operational.

### Meta Developer App

- **App name:** TRACES THREE
- **Platform:** Meta Developer Platform
- **Purpose:** Provides authenticated access to the Instagram Graph API

### Permissions Configured

Core permission:
- `instagram_business_basic`

Supporting permissions (via "Manage messaging & content on Instagram" use case):
- `instagram_manage_comments`
- `instagram_business_manage_messages`

### Account Connected

- **Username:** rjcicc
- **User ID:** 26071220029153617
- Successfully authorized for the application

### Access Token

- Working OAuth access token generated and stored
- **Location:** `.env.local` as `INSTAGRAM_ACCESS_TOKEN`
- Server-side only, not exposed to browser

### Verified Endpoints

**Identity:** `GET https://graph.instagram.com/me` — returns id + username

**Media:** `GET /me/media?fields=id,caption,media_type,media_url,permalink,timestamp` — returns media IDs, captions, image URLs, post timestamps, permalinks

## What This Enables

The system can programmatically retrieve:
- Instagram media, captions, timestamps, permalinks, media types

Potential integration points:
- Place pages
- Editorial surfaces
- Ingestion pipelines
- Media galleries

## Important API Constraints

The official Instagram API does **not** allow arbitrary scraping of other accounts. The API only returns data for:

1. Instagram accounts that authenticate with our app
2. Accounts we own or manage

This means the API cannot automatically ingest media from restaurants or venues unless they authorize the application. This constraint has architectural implications for Saiko's ingestion pipeline.

## Recommended Next Steps

### 1. Token Security

Rotate the access token (exposed during testing). Implement:
- `.env.local` storage (done)
- Server-side usage only (done)
- Periodic refresh policy (pending)

### 2. Server-Side Fetch Route

Add a backend endpoint (e.g. `/api/instagram/media`) to retrieve Instagram media using the stored token, so internal services can query without exposing tokens.

### 3. Media Ingestion Strategy

Three potential architectural models:

| Model | Description | Pros | Cons |
|-------|------------|------|------|
| **A — Merchant Authorization** | Restaurants authenticate their Instagram account | Fully compliant, reliable, scalable | Requires merchant participation |
| **B — Editorial Media Curation** | Editors manually attach Instagram posts to places | High quality, compliant, simple | Manual process |
| **C — Hybrid Signal Model** | Instagram as supplemental media source where available | Flexible, supports curated content | Inconsistent coverage |

**Recommended first version:** Editorial Media Attachment — editors select posts, system stores permalink + media_url + caption + timestamp, media displays on place pages. No scraping required.

### Longer-Term Opportunities

If Instagram becomes strategically important:
- Merchant account connection flow
- Automated media ingestion
- Instagram signal analysis (popularity/activity)
- Social discovery layers

## Key Takeaway

Instagram API integration is operationally verified. The next step is architectural: how Instagram media should be incorporated into the Saiko data and ingestion model.
