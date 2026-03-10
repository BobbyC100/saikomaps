/**
 * docs-sync-google.ts
 *
 * Syncs all canonical docs from docs/registry.json to Google Drive
 * as read-only Google Docs. Maintains docs/google-docs-map.json as
 * the sync state so subsequent runs update rather than duplicate.
 *
 * Usage:
 *   npm run docs:sync-google              — sync all canonical docs
 *   npm run docs:sync-google -- --dry-run — preview without uploading
 *   npm run docs:sync-google -- --doc-id SYS-PROMOTION-FLOW-V1  — sync one doc
 *
 * Required env vars (add to .env):
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH   — absolute path to GCP service account JSON key
 *   GOOGLE_DOCS_ROOT_FOLDER_ID        — Google Drive folder ID to sync into
 *
 * Drive structure created:
 *   Saiko Docs/
 *     KNOWLEDGE-SYSTEM/
 *     SAIKO/
 *     TRACES/
 *
 * Sync state stored in docs/google-docs-map.json (committed to repo).
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { google } from 'googleapis';
import { marked } from 'marked';
import * as dotenv from 'dotenv';

dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  doc_id: string;
  doc_type: string;
  status: string;
  title: string;
  path: string;
  owner: string;
  project_id: string;
  summary: string;
}

interface DocSyncState {
  google_doc_id: string;
  google_doc_url: string;
  last_synced: string;
}

interface SyncMap {
  last_synced: string;
  root_folder_id: string;
  folders: Record<string, string>;  // project_id → Drive folder ID
  docs: Record<string, DocSyncState>;  // doc_id → sync state
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const REGISTRY_PATH = join(ROOT, 'docs', 'registry.json');
const SYNC_MAP_PATH = join(ROOT, 'docs', 'google-docs-map.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
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
  return {
    last_synced: '',
    root_folder_id: '',
    folders: {},
    docs: {},
  };
}

function saveSyncMap(map: SyncMap): void {
  writeFileSync(SYNC_MAP_PATH, JSON.stringify(map, null, 2) + '\n', 'utf-8');
}

function markdownToHtml(markdown: string): string {
  // Strip YAML frontmatter before converting
  const stripped = markdown.replace(/^---[\s\S]*?---\n/, '');
  return marked(stripped) as string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
const rootFolderId = process.env.GOOGLE_DOCS_ROOT_FOLDER_ID;

if (!keyPath) fail('GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set in .env');
if (!rootFolderId) fail('GOOGLE_DOCS_ROOT_FOLDER_ID is not set in .env');

const resolvedKeyPath = resolve(keyPath!);
if (!existsSync(resolvedKeyPath)) {
  fail(`Service account key not found: ${resolvedKeyPath}`);
}

const serviceAccountKey = JSON.parse(readFileSync(resolvedKeyPath, 'utf-8'));

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// ── Drive operations ──────────────────────────────────────────────────────────

async function ensureFolder(name: string, parentId: string): Promise<string> {
  // Check if folder already exists
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create it
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
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
  const stream = Readable.from([htmlContent]);

  if (existingDocId) {
    // Update existing doc content
    await drive.files.update({
      fileId: existingDocId,
      requestBody: { name: title },
      media: {
        mimeType: 'text/html',
        body: stream,
      },
    });
    return {
      id: existingDocId,
      url: `https://docs.google.com/document/d/${existingDocId}/`,
    };
  }

  // Create new Google Doc from HTML
  const created = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      parents: [folderId],
    },
    media: {
      mimeType: 'text/html',
      body: stream,
    },
    fields: 'id',
  });

  const id = created.data.id!;
  return {
    id,
    url: `https://docs.google.com/document/d/${id}/`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load registry
  if (!existsSync(REGISTRY_PATH)) {
    fail('docs/registry.json not found. Run: npm run docs:registry');
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  let docs: RegistryEntry[] = registry.docs;

  // Filter to single doc if requested
  if (singleDocId) {
    docs = docs.filter(d => d.doc_id === singleDocId);
    if (docs.length === 0) fail(`doc_id '${singleDocId}' not found in registry`);
  }

  // Only sync active docs by default
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

  // Collect unique project_ids
  const projectIds = [...new Set(toSync.map(d => d.project_id).filter(Boolean))];

  // Ensure project_id folders exist
  for (const projectId of projectIds) {
    if (!syncMap.folders[projectId]) {
      syncMap.folders[projectId] = await ensureFolder(projectId, rootFolderId!);
    }
  }

  let synced = 0;
  let failed = 0;

  for (const doc of toSync) {
    const docPath = join(ROOT, doc.path);
    if (!existsSync(docPath)) {
      console.warn(`  [skip] File not found: ${doc.path}`);
      continue;
    }

    const markdown = readFileSync(docPath, 'utf-8');
    const html = markdownToHtml(markdown);
    const title = doc.title || doc.doc_id;
    const folderId = syncMap.folders[doc.project_id] ?? rootFolderId!;
    const existingState = syncMap.docs[doc.doc_id];

    try {
      const result = await uploadDoc(title, html, folderId, existingState?.google_doc_id);

      syncMap.docs[doc.doc_id] = {
        google_doc_id: result.id,
        google_doc_url: result.url,
        last_synced: new Date().toISOString(),
      };

      const action = existingState ? 'updated' : 'created';
      console.log(`  [${action}] ${doc.doc_id}  →  ${result.url}`);
      synced++;
    } catch (err) {
      console.error(`  [error] ${doc.doc_id}: ${(err as Error).message}`);
      failed++;
    }
  }

  syncMap.last_synced = new Date().toISOString();
  saveSyncMap(syncMap);

  console.log(`\n[docs:sync-google] Done. ${synced} synced, ${failed} failed.`);
  console.log(`[docs:sync-google] Sync map saved to docs/google-docs-map.json`);
}

main().catch(err => {
  console.error('[docs:sync-google] Fatal:', err.message);
  process.exit(1);
});
