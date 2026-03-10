/**
 * docs-sync-google.ts
 *
 * Syncs all canonical docs from docs/registry.json to Google Drive
 * as Google Docs. Maintains docs/google-docs-map.json as the sync
 * state so subsequent runs update rather than duplicate.
 *
 * Auth: OAuth2 with your personal Google account (files owned by you,
 * no storage quota issues). Tokens stored at:
 *   ~/.config/saiko/google-oauth-tokens.json
 *
 * First run:
 *   npm run docs:sync-google -- --auth   ← opens browser once, saves tokens
 *
 * Subsequent runs (silent):
 *   npm run docs:sync-google
 *   npm run docs:sync-google -- --dry-run
 *   npm run docs:sync-google -- --doc-id SYS-PROMOTION-FLOW-V1
 *
 * Required env vars (.env):
 *   GOOGLE_OAUTH_CLIENT_ID        — from GCP Console → Credentials → OAuth 2.0 Client
 *   GOOGLE_OAUTH_CLIENT_SECRET    — same credential
 *   GOOGLE_DOCS_ROOT_FOLDER_ID    — Drive folder ID to sync into
 *
 * Drive structure:
 *   Saiko Docs/
 *     KNOWLEDGE-SYSTEM/
 *     SAIKO/
 *     TRACES/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import * as http from 'http';
import { google } from 'googleapis';
import { marked } from 'marked';
import * as dotenv from 'dotenv';

dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  doc_id: string;
  status: string;
  title: string;
  path: string;
  project_id: string;
}

interface DocSyncState {
  google_doc_id: string;
  google_doc_url: string;
  last_synced: string;
}

interface SyncMap {
  last_synced: string;
  root_folder_id: string;
  folders: Record<string, string>;
  docs: Record<string, DocSyncState>;
}

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const REGISTRY_PATH = join(ROOT, 'docs', 'registry.json');
const SYNC_MAP_PATH = join(ROOT, 'docs', 'google-docs-map.json');
const TOKEN_PATH = join(homedir(), '.config', 'saiko', 'google-oauth-tokens.json');
const REDIRECT_URI = 'http://localhost:4242/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const authMode = args.includes('--auth');
const singleDocId = (() => {
  const idx = args.indexOf('--doc-id');
  return idx !== -1 ? args[idx + 1] : null;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`[docs:sync-google] ERROR: ${msg}`);
  process.exit(1);
}

function loadSyncMap(): SyncMap {
  if (existsSync(SYNC_MAP_PATH)) {
    return JSON.parse(readFileSync(SYNC_MAP_PATH, 'utf-8')) as SyncMap;
  }
  return { last_synced: '', root_folder_id: '', folders: {}, docs: {} };
}

function saveSyncMap(map: SyncMap): void {
  writeFileSync(SYNC_MAP_PATH, JSON.stringify(map, null, 2) + '\n', 'utf-8');
}

function markdownToHtml(markdown: string): string {
  const stripped = markdown.replace(/^---[\s\S]*?---\n/, '');
  return marked(stripped) as string;
}

// ── OAuth2 ────────────────────────────────────────────────────────────────────

const clientId     = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const rootFolderId = process.env.GOOGLE_DOCS_ROOT_FOLDER_ID;

if (!clientId)     fail('GOOGLE_OAUTH_CLIENT_ID is not set in .env');
if (!clientSecret) fail('GOOGLE_OAUTH_CLIENT_SECRET is not set in .env');
if (!rootFolderId) fail('GOOGLE_DOCS_ROOT_FOLDER_ID is not set in .env');

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

async function runAuthFlow(): Promise<void> {
  const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

  console.log('\n[docs:sync-google] Opening browser for Google auth...');
  console.log('If it does not open automatically, visit:\n');
  console.log(url, '\n');

  // Try to open the browser
  const { exec } = await import('child_process');
  exec(`open "${url}"`);

  // Wait for the redirect callback on localhost:4242
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlObj = new URL(req.url!, `http://localhost:4242`);
      const code = urlObj.searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Auth complete. You can close this tab.</h2>');
        server.close();
        resolve(code);
      } else {
        const error = urlObj.searchParams.get('error');
        res.writeHead(400);
        res.end('Auth failed');
        server.close();
        reject(new Error(`Auth failed: ${error}`));
      }
    });
    server.listen(4242);
    console.log('[docs:sync-google] Waiting for auth callback on http://localhost:4242 ...');
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  mkdirSync(join(homedir(), '.config', 'saiko'), { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
  console.log(`[docs:sync-google] Tokens saved to ${TOKEN_PATH}`);
}

async function loadTokens(): Promise<void> {
  if (!existsSync(TOKEN_PATH)) {
    fail(`No auth tokens found. Run first: npm run docs:sync-google -- --auth`);
  }
  const tokens = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) as OAuthTokens;
  oauth2Client.setCredentials(tokens);

  // Auto-refresh if expiring within 5 minutes
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2), 'utf-8');
  }
}

// ── Drive operations ──────────────────────────────────────────────────────────

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
  });
  if (res.data.files?.length) return res.data.files[0].id!;

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  console.log(`  [drive] Created folder: ${name}`);
  return created.data.id!;
}

async function uploadDoc(
  title: string,
  htmlContent: string,
  folderId: string,
  existingDocId?: string,
): Promise<{ id: string; url: string }> {
  const { Readable } = await import('stream');

  if (existingDocId) {
    await drive.files.update({
      fileId: existingDocId,
      requestBody: { name: title },
      media: { mimeType: 'text/html', body: Readable.from([htmlContent]) },
    });
    return { id: existingDocId, url: `https://docs.google.com/document/d/${existingDocId}/` };
  }

  const created = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      parents: [folderId],
    },
    media: { mimeType: 'text/html', body: Readable.from([htmlContent]) },
    fields: 'id',
  });

  const id = created.data.id!;
  return { id, url: `https://docs.google.com/document/d/${id}/` };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (authMode) {
    await runAuthFlow();
    console.log('\n[docs:sync-google] Auth complete. Run without --auth to sync docs.');
    return;
  }

  await loadTokens();

  if (!existsSync(REGISTRY_PATH)) fail('docs/registry.json not found. Run: npm run docs:registry');

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  let docs: RegistryEntry[] = registry.docs;

  if (singleDocId) {
    docs = docs.filter(d => d.doc_id === singleDocId);
    if (!docs.length) fail(`doc_id '${singleDocId}' not found in registry`);
  }

  const toSync = docs.filter(d => d.status === 'active' || d.status === 'draft');
  console.log(`[docs:sync-google] ${dryRun ? 'DRY RUN — ' : ''}Syncing ${toSync.length} docs`);

  if (dryRun) {
    for (const doc of toSync) {
      console.log(`  ${doc.doc_id}  →  ${doc.project_id}/${doc.title || doc.path}`);
    }
    console.log('\n[docs:sync-google] Dry run complete. No files uploaded.');
    return;
  }

  const syncMap = loadSyncMap();
  syncMap.root_folder_id = rootFolderId!;

  const projectIds = [...new Set(toSync.map(d => d.project_id).filter(Boolean))];
  for (const pid of projectIds) {
    if (!syncMap.folders[pid]) {
      syncMap.folders[pid] = await ensureFolder(pid, rootFolderId!);
    }
  }

  let synced = 0;
  let failed = 0;

  for (const doc of toSync) {
    const docPath = join(ROOT, doc.path);
    if (!existsSync(docPath)) { console.warn(`  [skip] ${doc.path} not found`); continue; }

    const html = markdownToHtml(readFileSync(docPath, 'utf-8'));
    const title = doc.title || doc.doc_id;
    const folderId = syncMap.folders[doc.project_id] ?? rootFolderId!;
    const existing = syncMap.docs[doc.doc_id];

    try {
      const result = await uploadDoc(title, html, folderId, existing?.google_doc_id);
      syncMap.docs[doc.doc_id] = {
        google_doc_id: result.id,
        google_doc_url: result.url,
        last_synced: new Date().toISOString(),
      };
      console.log(`  [${existing ? 'updated' : 'created'}] ${doc.doc_id}  →  ${result.url}`);
      synced++;
    } catch (err) {
      console.error(`  [error] ${doc.doc_id}: ${(err as Error).message}`);
      failed++;
    }
  }

  syncMap.last_synced = new Date().toISOString();
  saveSyncMap(syncMap);
  console.log(`\n[docs:sync-google] Done. ${synced} synced, ${failed} failed.`);
}

main().catch(err => {
  console.error('[docs:sync-google] Fatal:', err.message);
  process.exit(1);
});
