/**
 * docs-backfill-frontmatter.ts
 *
 * One-time backfill: adds canonical frontmatter to all docs/ files
 * that are missing a doc_id. Infers doc_id, doc_type, and project_id
 * from the file path; extracts title from the first # heading.
 *
 * Usage:
 *   npm run docs:backfill          — apply to all uncontrolled docs
 *   npm run docs:backfill -- --dry-run
 *
 * Files that already have a doc_id are skipped untouched.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, join, relative } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter') as typeof import('gray-matter');

// ── Inference helpers ─────────────────────────────────────────────────────────

function inferDocId(relPath: string): string {
  // docs/system/promotion-flow-v1.md → SYS-PROMOTION-FLOW-V1
  // docs/architecture/system_contract.md → ARCH-SYSTEM-CONTRACT
  // docs/ENERGY_SCORE_SPEC.md → SAIKO-ENERGY-SCORE-SPEC
  const stripped = relPath
    .replace(/^docs\//, '')
    .replace(/\.md$/, '')
    .replace(/\//g, '-')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Prefix by top-level dir to avoid collisions
  const parts = relPath.replace(/^docs\//, '').split('/');
  if (parts.length === 1) {
    // Avoid double SAIKO- prefix (e.g. saiko-merchant-data-hierarchy.md)
    if (stripped.startsWith('SAIKO-')) return stripped;
    return `SAIKO-${stripped}`;
  }

  const prefixMap: Record<string, string> = {
    'system':           'SYS',
    'skai':             'SKAI',
    'architecture':     'ARCH',
    'features':         'FEAT',
    'scenesense':       'SS',
    'offering-signals': 'OS',
    'voice':            'VOICE',
    'decisions':        'DEC',
    'ui':               'UI',
    'debugging':        'OPS',
  };

  const prefix = prefixMap[parts[0]] ?? 'SAIKO';
  // Strip .md before uppercasing to avoid -MD suffix
  const rest = parts.slice(1).join('-').replace(/\.md$/i, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // For decisions/, the filename IS the id (DEC-001 not DEC-DEC-001)
  if (parts[0] === 'decisions') return rest;

  // Avoid double-prefix (e.g. SAIKO-SAIKO-foo)
  const prefixPattern = new RegExp(`^${prefix}-`, 'i');
  if (prefixPattern.test(rest)) return rest;

  return `${prefix}-${rest}`;
}



function inferDocType(relPath: string): string {
  const up = relPath.toUpperCase();
  const base = basename(relPath).toUpperCase();

  if (base === 'README.MD')                             return 'overview';
  if (up.includes('OVERVIEW'))                          return 'overview';
  if (up.includes('RUNBOOK'))                           return 'runbook';
  if (up.includes('LOCAL_DEV') || up.includes('LOCAL-DEV')) return 'runbook';
  if (up.includes('_SPEC') || up.includes('SPEC_') || base.endsWith('SPEC.MD')) return 'spec';
  if (up.includes('SCHEMA'))                            return 'reference';
  if (up.includes('GUIDE'))                             return 'guide';
  // domain-spec checks before architecture to avoid CONTRACT false-match
  if (relPath.includes('offering-signals') ||
      relPath.includes('display-contract') ||
      relPath.includes('voice-layer'))                  return 'domain-spec';
  if (relPath.includes('/decisions/'))                  return 'decision';
  if (up.includes('ARCHITECTURE') || up.includes('CONTRACT') ||
      up.includes('DATA_LAYER') || up.includes('HIERARCHY') ||
      up.includes('AI_OPERATING') || up.includes('PLATFORM_DATA') ||
      up.includes('PROVENANCE_SYSTEM') || up.includes('RESOLVER'))
                                                        return 'architecture';
  if (up.includes('PATCH-LOG') || up.includes('PATCH_LOG')) return 'changelog';
  if (up.includes('MIGRATION'))                         return 'guide';
  if (up.includes('DEBUG') || up.includes('STALE'))     return 'runbook';
  if (up.includes('TEMPLATE') || up.includes('ENV_') ||
      up.includes('SETUP') || up.includes('SITEMAP') ||
      up.includes('COMMANDS') || up.includes('QUICK') ||
      up.includes('PIPELINE') || up.includes('SYNC') ||
      up.includes('PROVENANCE_QUICK'))                  return 'reference';
  if (relPath.includes('/features/'))                   return 'product-spec';
  if (relPath.includes('/architecture/'))               return 'architecture';
  if (relPath.includes('/system/'))                     return 'system';

  return 'document';
}

function inferProjectId(relPath: string): string {
  if (relPath.startsWith('docs/system/') ||
      relPath.startsWith('docs/skai/'))      return 'KNOWLEDGE-SYSTEM';
  if (relPath.startsWith('docs/voice/') ||
      relPath.startsWith('docs/scenesense/') ||
      relPath.startsWith('docs/offering-signals/')) return 'TRACES';
  return 'SAIKO';
}

function inferSystems(relPath: string): string[] {
  if (relPath.startsWith('docs/system/') ||
      relPath.startsWith('docs/skai/'))      return ['knowledge-system'];
  if (relPath.startsWith('docs/voice/'))     return ['voice-engine', 'traces'];
  if (relPath.startsWith('docs/scenesense/')) return ['scenesense', 'traces'];
  if (relPath.startsWith('docs/offering-signals/')) return ['offering-signals', 'traces'];
  if (relPath.startsWith('docs/architecture/')) return ['platform'];
  if (relPath.includes('DATABASE') || relPath.includes('SCHEMA') ||
      relPath.includes('MIGRATION') || relPath.includes('FIELDS')) return ['database'];
  if (relPath.includes('PIPELINE') || relPath.includes('PROVENANCE') ||
      relPath.includes('ENRICHMENT') || relPath.includes('RESOLVER')) return ['data-pipeline'];
  return [];
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

// ── Walk docs/ ─────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, 'docs');
const dryRun = process.argv.includes('--dry-run');
const today = new Date().toISOString().split('T')[0];

function walkDocs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'registry.json') continue;
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

const allFiles = walkDocs(DOCS_DIR);
let applied = 0;
let skipped = 0;

for (const absPath of allFiles) {
  const relPath = relative(ROOT, absPath).replace(/\\/g, '/');
  const raw = readFileSync(absPath, 'utf-8');
  const parsed = matter(raw);

  // Skip if already has doc_id
  if (parsed.data.doc_id) {
    skipped++;
    continue;
  }

  const docId      = inferDocId(relPath);
  const docType    = inferDocType(relPath);
  const projectId  = inferProjectId(relPath);
  const systems    = inferSystems(relPath);
  const title      = extractTitle(parsed.content);

  const newFm = {
    ...parsed.data,           // preserve any existing partial frontmatter
    doc_id:       docId,
    doc_type:     docType,
    status:       parsed.data.status      ?? 'active',
    owner:        parsed.data.owner       ?? 'Bobby Ciccaglione',
    created:      parsed.data.created     ?? today,
    last_updated: today,
    project_id:   projectId,
    ...(systems.length > 0 ? { systems } : {}),
    ...(title ? { summary: parsed.data.summary ?? '' } : {}),
  };

  if (dryRun) {
    console.log(`  ${relPath}`);
    console.log(`    doc_id: ${docId}  doc_type: ${docType}  project_id: ${projectId}`);
  } else {
    const output = matter.stringify(parsed.content, newFm);
    writeFileSync(absPath, output, 'utf-8');
  }

  applied++;
}

if (dryRun) {
  console.log(`\n[docs:backfill] DRY RUN — would apply frontmatter to ${applied} files, skip ${skipped}`);
} else {
  console.log(`[docs:backfill] Applied frontmatter to ${applied} files, skipped ${skipped} (already controlled)`);
}
