import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// ── Types ─────────────────────────────────────────────────────

interface SessionRecord {
  // Explicit boot fields (v2+)
  session_id?: string;
  next_session_objective?: string;
  recommended_first_work_order?: string;
  projects_for_next_session?: string[];
  open_items?: string[];
  verification_notes?: string;
  system_status?: string;
  commit_hash?: string;
  // Legacy fields (v1 fallback)
  next_move?: string;
  systems_advanced?: string[];
  open_threads?: string[];
  [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

const W = 50;
const DIVIDER = '─'.repeat(W);

function line(label: string, value: string) {
  console.log(`${label.padEnd(24)}${value}`);
}

function header(title: string) {
  console.log('');
  console.log(title);
  console.log(DIVIDER);
}

// ── Locate most recent session ────────────────────────────────

const sessionsDir = join(process.cwd(), 'ai-operations/sessions');

if (!existsSync(sessionsDir)) {
  console.error('[boot] ERROR: ai-operations/sessions/ not found.');
  process.exit(1);
}

const sessionFiles = readdirSync(sessionsDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .reverse();

if (sessionFiles.length === 0) {
  console.error('[boot] ERROR: No session files found in ai-operations/sessions/.');
  process.exit(1);
}

const latestFile = sessionFiles[0];
const latestPath = join(sessionsDir, latestFile);
let session: SessionRecord = {};

try {
  session = JSON.parse(readFileSync(latestPath, 'utf-8')) as SessionRecord;
} catch (err) {
  console.error(`[boot] ERROR: Failed to parse ${latestFile}: ${(err as Error).message}`);
  process.exit(1);
}

// ── Extract fields (prefer explicit v2 fields, fall back to legacy) ──

const sessionId      = session.session_id ?? '(unknown)';
const nextObjective  = session.next_session_objective       ?? session.next_move          ?? '(none recorded)';
const firstWorkOrder = session.recommended_first_work_order ?? session.next_move          ?? '(none recorded)';
const openItems      = session.open_items                   ?? session.open_threads       ?? [];
const projects       = session.projects_for_next_session    ?? session.systems_advanced   ?? [];
const verifyNotes    = session.verification_notes;
const systemStatus   = session.system_status;
const commitHash     = session.commit_hash;

// ── System checks ─────────────────────────────────────────────

const gitStatusRaw  = git('status --porcelain');
const gitBranch     = git('rev-parse --abbrev-ref HEAD');
const repoClean     = gitStatusRaw.length === 0;
const envPresent    = existsSync(join(process.cwd(), '.env'));
const depsInstalled = existsSync(join(process.cwd(), 'node_modules'));

// ── Print boot packet ─────────────────────────────────────────

console.log('');
console.log('--'.repeat(W / 2));
console.log('SAIKO ENGINEERING BOOT');
console.log('--'.repeat(W / 2));

header('LAST SESSION');
console.log(sessionId);

header('Next Objective');
console.log(nextObjective);

header('Open Items');
if (openItems.length > 0) {
  openItems.forEach(item => console.log(`- ${item}`));
} else {
  console.log('(none recorded)');
}

header('Recommended First Work Order');
console.log(firstWorkOrder);

if (projects.length > 0) {
  header('Projects');
  projects.forEach(p => console.log(`- ${p}`));
}

if (verifyNotes) {
  header('Verification Notes');
  console.log(verifyNotes);
}

header('SYSTEM CHECKS');
line('Branch:', gitBranch || '(unknown)');
line('Commit:', commitHash ?? '(unknown)');
line('Repo clean:', repoClean ? 'YES' : `NO  (${gitStatusRaw.split('\n').length} changes)`);
line('Env present:', envPresent ? 'YES' : 'NO  (.env missing)');
line('Dependencies installed:', depsInstalled ? 'YES' : 'NO  (run npm install)');
if (systemStatus) {
  const indicator = systemStatus === 'green' ? '●' : systemStatus === 'yellow' ? '◐' : '○';
  line('System status:', `${indicator}  ${systemStatus.toUpperCase()}`);
}

console.log('');
console.log('--'.repeat(W / 2));
console.log('');
