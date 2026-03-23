/**
 * sync-docs-to-drive.ts
 *
 * Syncs all registered docs from docs/registry.json to a Google Drive folder,
 * uploading as Google Docs (markdown converted via HTML).
 *
 * Drive folder structure mirrors these subfolders:
 *   FIELDS, KNOWLEDGE-SYSTEM, PLACE-PAGE, SAIKO (default), TRACES
 *
 * Mapping: doc_type or systems field -> Drive subfolder.
 *
 * Auth: OAuth2 via GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
 * from .env.local. On first run, opens browser for consent and stores
 * refresh token at .google-drive-token.json (gitignored).
 *
 * Usage:
 *   npm run docs:sync          # sync all registered docs
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as http from 'http';
import { google } from 'googleapis';
import { marked } from 'marked';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  doc_id: string;
  doc_type: string;
  status: string;
  title: string;
  path: string;
  owner: string;
  systems: string[];
}

interface Registry {
  generated: string;
  doc_count: number;
  docs: RegistryEntry[];
}

interface DocState {
  drive_file_id: string;
  drive_url: string;
  content_hash: string;
  last_synced: string;
  subfolder: string;
}

interface SyncState {
  last_synced: string;
  docs: Record<string, DocState>;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const REGISTRY_PATH = join(ROOT, 'docs', 'registry.json');
const TOKEN_PATH = join(ROOT, '.google-drive-token.json');
const SYNC_STATE_PATH = join(ROOT, 'docs', 'drive-sync-state.json');
const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const TARGET_FOLDER_ID = '1Dod-GaQff4n5TqRXuDroDxwct3Z-5R2T';

// Known subfolders in the target Drive folder
const SUBFOLDER_NAMES = ['FIELDS', 'TRACES', 'ARCHITECTURE', 'OPS', 'KNOWLEDGE-SYSTEM', 'PRODUCT', 'PLACE-PAGE'] as const;
type SubfolderName = typeof SUBFOLDER_NAMES[number];

// ── Env parsing (.env.local) ──────────────────────────────────────────────────

function loadEnvLocal(): Record<string, string> {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return {};
  const vars: Record<string, string> = {};
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

const envVars = loadEnvLocal();
const clientId = envVars.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = envVars.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`[docs:sync] ERROR: ${msg}`);
  process.exit(1);
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function markdownToHtml(md: string): string {
  // Strip YAML frontmatter
  const stripped = md.replace(/^---[\s\S]*?---\n/, '');
  return marked(stripped) as string;
}

/**
 * Map a registry entry to a Drive subfolder name.
 *
 * Folders:
 *   FIELDS          — data layer, signals, enrichment pipeline, claims, sanctions
 *   TRACES          — SceneSense, place page, voice, UI specs
 *   ARCHITECTURE    — system design, identity, coverage ops, Instagram, social
 *   OPS             — runbooks, setup, migration, dev guides, deployment
 *   KNOWLEDGE-SYSTEM — meta docs about how the KB works
 *   PRODUCT         — feature specs, markets, concepts
 *   PLACE-PAGE      — place page layout and design specs
 */
function mapToSubfolder(entry: RegistryEntry): SubfolderName {
  const id = entry.doc_id.toLowerCase();
  const dtype = entry.doc_type.toLowerCase();
  const systems = entry.systems.map(s => s.toLowerCase());
  const allTokens = [dtype, ...systems];

  // ── OPS: SOPs always route here regardless of other system tags ──
  if (dtype === 'sop') return 'OPS';

  // ── KNOWLEDGE-SYSTEM: meta/system docs about how the KB works ──
  if (systems.includes('repo-workflow') || systems.includes('boot-system') ||
      id.startsWith('sys-') || id.startsWith('dec-') ||
      allTokens.some(t => t.includes('knowledge'))) {
    return 'KNOWLEDGE-SYSTEM';
  }

  // ── PLACE-PAGE: place page layout specs ──
  if (allTokens.some(t => t.includes('place-page'))) return 'PLACE-PAGE';

  // ── TRACES: SceneSense, voice, place page design, UI consumer specs ──
  if (id.startsWith('ss-') || id.startsWith('voice-') ||
      allTokens.some(t => t === 'scenesense' || t === 'voice-engine' || t === 'traces') ||
      dtype === 'traces' || dtype === 'domain-spec' ||
      id.includes('traces')) {
    return 'TRACES';
  }

  // ── FIELDS: data layer, signals, enrichment, claims, sanctions ──
  if (allTokens.some(t => t.includes('field') || t.includes('signal') || t.includes('claim') ||
      t === 'enrichment' || t === 'coverage') ||
      id.includes('fields') || id.includes('signal') ||
      id.startsWith('os-') || id.startsWith('pipe-')) {
    return 'FIELDS';
  }

  // ── PRODUCT: feature specs, concepts, markets ──
  if (dtype === 'feature' || dtype === 'concept' || dtype === 'product' ||
      id.startsWith('feat-') || id.startsWith('pi-') ||
      id.includes('markets') || id.includes('concept')) {
    return 'PRODUCT';
  }

  // ── OPS: runbooks, setup, migration, deployment, admin, dev guides ──
  if (dtype === 'ops' || dtype === 'runbook' || dtype === 'guide' ||
      id.includes('runbook') || id.includes('setup') || id.includes('migration') ||
      id.includes('local-dev') || id.includes('env-template') ||
      id.includes('pipeline-commands') || id.includes('quick-start') ||
      id.includes('sync-runbook') || id.includes('sitemap') ||
      id.includes('spring-cleaning') || id.includes('stale-deployment') ||
      systems.includes('admin-tools') || systems.includes('ops') || systems.includes('deployment')) {
    return 'OPS';
  }

  // ── ARCHITECTURE: system design, identity, coverage ops, social, Instagram ──
  if (dtype === 'architecture' || id.startsWith('arch-') ||
      id.includes('architecture') || id.includes('identity') ||
      id.includes('instagram') || id.includes('social') ||
      id.includes('enrichment-model') || id.includes('program-template') ||
      id.includes('contract') || id.includes('hierarchy') ||
      id.includes('provenance') || id.includes('platform')) {
    return 'ARCHITECTURE';
  }

  // Default to ARCHITECTURE for anything unmatched
  return 'ARCHITECTURE';
}

function loadSyncState(): SyncState {
  if (existsSync(SYNC_STATE_PATH)) {
    return JSON.parse(readFileSync(SYNC_STATE_PATH, 'utf-8')) as SyncState;
  }
  return { last_synced: '', docs: {} };
}

function saveSyncState(state: SyncState): void {
  writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

// ── OAuth2 ────────────────────────────────────────────────────────────────────

if (!clientId) fail('GOOGLE_OAUTH_CLIENT_ID not set in .env.local or environment');
if (!clientSecret) fail('GOOGLE_OAUTH_CLIENT_SECRET not set in .env.local or environment');

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

async function runAuthFlow(): Promise<void> {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n[docs:sync] Opening browser for Google OAuth consent...');
  console.log('If it does not open automatically, visit:\n');
  console.log(url, '\n');

  const { exec } = await import('child_process');
  exec(`open "${url}"`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlObj = new URL(req.url!, `http://localhost:3333`);
      const authCode = urlObj.searchParams.get('code');
      if (authCode) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Auth complete. You can close this tab.</h2>');
        server.close();
        resolve(authCode);
      } else {
        const error = urlObj.searchParams.get('error');
        res.writeHead(400);
        res.end('Auth failed');
        server.close();
        reject(new Error(`Auth failed: ${error}`));
      }
    });
    server.listen(3333);
    console.log('[docs:sync] Waiting for auth callback on http://localhost:3333/callback ...');
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
  console.log(`[docs:sync] Tokens saved to ${TOKEN_PATH}`);
}

async function loadTokens(): Promise<void> {
  if (!existsSync(TOKEN_PATH)) {
    console.log('[docs:sync] No token file found. Starting auth flow...');
    await runAuthFlow();
    return;
  }
  const tokens = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
  oauth2Client.setCredentials(tokens);

  // Auto-refresh if expiring within 5 minutes
  if (tokens.expiry_date && tokens.expiry_date < Date.now() + 5 * 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2), 'utf-8');
    console.log('[docs:sync] Tokens refreshed.');
  }
}

// ── Drive operations ──────────────────────────────────────────────────────────

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/** Cache of subfolder name -> Drive folder ID */
const subfolderIds: Record<string, string> = {};

async function resolveSubfolders(): Promise<void> {
  const res = await drive.files.list({
    q: `'${TARGET_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  for (const file of res.data.files ?? []) {
    if (file.name && file.id) {
      subfolderIds[file.name] = file.id;
    }
  }

  // Create missing subfolders
  for (const name of SUBFOLDER_NAMES) {
    if (!subfolderIds[name]) {
      console.log(`[docs:sync] Creating subfolder "${name}" in Drive...`);
      const created = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [TARGET_FOLDER_ID],
        },
        fields: 'id',
      });
      if (created.data.id) {
        subfolderIds[name] = created.data.id;
      }
    }
  }
}

async function findExistingFile(name: string, folderId: string): Promise<string | null> {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });
  return res.data.files?.[0]?.id ?? null;
}

async function uploadDoc(
  title: string,
  htmlContent: string,
  folderId: string,
  existingFileId?: string,
): Promise<{ id: string; url: string; action: 'created' | 'updated' }> {
  const { Readable } = await import('stream');

  if (existingFileId) {
    await drive.files.update({
      fileId: existingFileId,
      requestBody: { name: title },
      media: { mimeType: 'text/html', body: Readable.from([htmlContent]) },
    });
    return {
      id: existingFileId,
      url: `https://docs.google.com/document/d/${existingFileId}/`,
      action: 'updated',
    };
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
  return {
    id,
    url: `https://docs.google.com/document/d/${id}/`,
    action: 'created',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await loadTokens();

  if (!existsSync(REGISTRY_PATH)) {
    fail('docs/registry.json not found. Run: npm run docs:registry');
  }

  const registry: Registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  const docs = registry.docs;
  console.log(`[docs:sync] Found ${docs.length} registered docs`);

  // Resolve Drive subfolder IDs
  await resolveSubfolders();

  const syncState = loadSyncState();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const docPath = join(ROOT, doc.path);
    if (!existsSync(docPath)) {
      console.warn(`  [skip] ${doc.path} — file not found`);
      skipped++;
      continue;
    }

    const rawContent = readFileSync(docPath, 'utf-8');
    const currentHash = hashContent(rawContent);

    // Check if content unchanged
    const existing = syncState.docs[doc.doc_id];
    if (existing && existing.content_hash === currentHash) {
      skipped++;
      continue;
    }

    const subfolder = mapToSubfolder(doc);
    const folderId = subfolderIds[subfolder] ?? TARGET_FOLDER_ID;
    const title = doc.title || doc.doc_id;
    const html = markdownToHtml(rawContent);

    try {
      // Check if we have a known Drive file ID, or search for existing file by name
      let existingFileId = existing?.drive_file_id;
      if (!existingFileId) {
        existingFileId = (await findExistingFile(title, folderId)) ?? undefined;
      }

      const result = await uploadDoc(title, html, folderId, existingFileId);

      syncState.docs[doc.doc_id] = {
        drive_file_id: result.id,
        drive_url: result.url,
        content_hash: currentHash,
        last_synced: new Date().toISOString(),
        subfolder,
      };

      if (result.action === 'created') {
        console.log(`  [created] ${doc.doc_id} -> ${subfolder}`);
        created++;
      } else {
        console.log(`  [updated] ${doc.doc_id} -> ${subfolder}`);
        updated++;
      }
    } catch (err) {
      console.error(`  [error] ${doc.doc_id}: ${(err as Error).message}`);
      skipped++;
    }
  }

  syncState.last_synced = new Date().toISOString();
  saveSyncState(syncState);

  console.log(`\n[docs:sync] Summary: created ${created}, updated ${updated}, skipped ${skipped}`);
}

main().catch(err => {
  console.error('[docs:sync] Fatal:', err.message);
  process.exit(1);
});
