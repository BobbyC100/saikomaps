# Standalone Admin UI

## Overview

This folder contains a standalone HTML admin interface for the Saiko Resolver system. It can be used independently of the Next.js application.

## File

- `admin-standalone.html` - Complete single-file React app (no build required)

## Usage

### Option 1: Open Directly in Browser

1. Open `admin-standalone.html` in your browser
2. By default, it runs in **Demo Mode** with mock data
3. You can navigate through the UI and test the workflow

### Option 2: Connect to Your API

1. Open `admin-standalone.html` in a text editor
2. Find the `API_CONFIG` section (around line 681):

```javascript
const API_CONFIG = {
  baseUrl: 'http://localhost:3000',  // Your Saiko API
  useMockData: false,                 // Set to false for real data
  // ...
};
```

3. Set `useMockData: false`
4. Update `baseUrl` if needed
5. Save and open in browser

### Option 3: Serve via Next.js

Your Next.js app automatically serves this file at:
```
http://localhost:3000/admin-standalone.html
```

## Features

- **Review Queue** - Side-by-side comparison with keyboard shortcuts
- **Dashboard** - System stats and metrics
- **Import CSV** - Upload editorial data (coming soon)
- **Browse Data** - Search golden records (coming soon)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `M` | Merge (same place) |
| `D` | Different (keep separate) |
| `S` | Skip (review later) |
| `F` | Flag (escalate) |
| `R` | Refresh queue |
| `N` / `→` | Next item |
| `P` / `←` | Previous item |

## CORS Setup (If Needed)

If you run this HTML file directly (not via Next.js), you may need to enable CORS on your API.

Add to `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/api/admin/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      ],
    },
  ];
}
```

## Why a Standalone Version?

Benefits:
- **No build step** - Just open in browser
- **Easy demo** - Share with stakeholders
- **Testing** - Test API without running Next.js
- **Portable** - Can be hosted anywhere (CDN, S3, etc.)

## Demo Mode

The file includes mock data so you can explore the UI immediately:
- 3 example review items
- Realistic stats
- Full keyboard navigation
- Streak tracking

Perfect for:
- Learning the workflow
- Training reviewers
- Taking screenshots
- Presentations

## Production Use

For production, we recommend using the Next.js integrated version at `/app/admin/review` because:
- Better performance (server-side rendering)
- Proper authentication
- Database integration
- Better error handling

But this standalone version is great for:
- Quick testing
- Demos
- Training
- Backup admin interface
