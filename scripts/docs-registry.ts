/**
 * docs-registry.ts
 *
 * Scans docs/ recursively, finds all canonical markdown documents
 * (identified by a doc_id in their YAML frontmatter), and writes
 * a machine-readable index to docs/registry.json.
 *
 * Usage:
 *   npm run docs:registry
 *
 * Only files with a `doc_id` frontmatter field are included.
 * Files without doc_id are uncontrolled and excluded from the registry.
 *
 * Output shape:
 *   {
 *     generated: ISO timestamp,
 *     doc_count: number,
 *     docs: RegistryEntry[]
 *   }
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter') as typeof import('gray-matter');

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  doc_id: string;
  doc_type: string;
  status: string;
  title: string;
  path: string;
  owner: string;
  created: string;
  last_updated: string;
  project_id: string;
  summary: string;
  systems: string[];
  related_docs: string[];
  category: string | null;
  tags: string[];
  source: string;
  source_url?: string;
}

interface Registry {
  generated_at: string;
  doc_count: number;
  docs: RegistryEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, 'docs');
const REGISTRY_PATH = join(DOCS_DIR, 'registry.json');

// Additional directories outside docs/ that contain controlled documents
const EXTRA_SCAN_DIRS = [
  join(ROOT, 'ai-operations'),
  join(ROOT, 'lib/signals'),
  join(ROOT, 'lib/voice-engine'),
  join(ROOT, 'lib/voice-engine-v2'),
  join(ROOT, 'scripts/sql'),
  join(ROOT, 'data'),
  join(ROOT, 'components/homepage'),
  join(ROOT, 'components/search-results'),
  join(ROOT, 'public'),
  join(ROOT, '.github'),
];

function walkDocs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDocs(full));
    } else if (entry.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function extractTitle(content: string, frontmatterTitle?: string): string {
  if (frontmatterTitle) return String(frontmatterTitle);
  // Pull first # heading from body
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '(untitled)';
}

function toStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return [val];
  return [];
}

// ── Scan ──────────────────────────────────────────────────────────────────────

// Individual files outside scanned directories
const EXTRA_FILES = [
  join(ROOT, 'README.md'),
];

const allFiles = [
  ...walkDocs(DOCS_DIR),
  ...EXTRA_SCAN_DIRS.flatMap((dir) => {
    try { return walkDocs(dir); } catch { return []; }
  }),
  ...EXTRA_FILES.filter((f) => {
    try { statSync(f); return true; } catch { return false; }
  }),
];
const entries: RegistryEntry[] = [];
const skipped: string[] = [];

for (const absPath of allFiles) {
  const relPath = relative(ROOT, absPath).replace(/\\/g, '/');

  // Skip registry.json itself if it somehow ends up here
  if (relPath === 'docs/registry.json') continue;

  let raw: string;
  try {
    raw = readFileSync(absPath, 'utf-8');
  } catch {
    continue;
  }

  const parsed = matter(raw);
  const fm = parsed.data;

  // Only include files with a doc_id — these are canonical controlled docs
  if (!fm.doc_id) {
    skipped.push(relPath);
    continue;
  }

  const entry: RegistryEntry = {
    doc_id:       String(fm.doc_id),
    doc_type:     String(fm.doc_type     ?? 'document'),
    status:       String(fm.status       ?? 'unknown'),
    title:        extractTitle(parsed.content, fm.title as string | undefined),
    path:         relPath,
    owner:        String(fm.owner        ?? ''),
    created:      String(fm.created      ?? ''),
    last_updated: String(fm.last_updated ?? ''),
    project_id:   String(fm.project_id   ?? ''),
    summary:      String(fm.summary      ?? ''),
    systems:      toStringArray(fm.systems),
    related_docs: toStringArray(fm.related_docs),
    category:     fm.category ? String(fm.category) : null,
    tags:         toStringArray(fm.tags),
    source:       String(fm.source ?? 'repo'),
  };

  if (fm.source_url) {
    entry.source_url = String(fm.source_url);
  }

  entries.push(entry);
}

// Sort by doc_id for stable output
entries.sort((a, b) => a.doc_id.localeCompare(b.doc_id));

const registry: Registry = {
  generated_at: new Date().toISOString(),
  doc_count: entries.length,
  docs: entries,
};

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');

console.log(`[docs:registry] Wrote ${entries.length} canonical docs to docs/registry.json`);
if (skipped.length > 0) {
  console.log(`[docs:registry] Skipped ${skipped.length} uncontrolled files (no doc_id)`);
}
