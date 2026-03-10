import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

const hr = '─'.repeat(56);

function section(title: string) {
  console.log(`\n┌${hr}┐`);
  const pad = hr.length - title.length - 2;
  console.log(`│  ${title}${' '.repeat(pad)}│`);
  console.log(`└${hr}┘\n`);
}

// ── Branch & status ──────────────────────────────────────────
const branch = git('rev-parse --abbrev-ref HEAD');
const statusRaw = git('status --porcelain');
const isDirty = statusRaw.length > 0;

section('GIT STATUS');
console.log(`Branch : ${branch}`);
console.log(`Status : ${isDirty ? 'DIRTY — uncommitted changes present' : 'CLEAN — working tree is clean'}`);

// ── Staged changes ───────────────────────────────────────────
const stagedStat = git('diff --staged --stat');
if (stagedStat) {
  console.log('\nStaged changes:\n');
  console.log(stagedStat);
} else {
  console.log('\nStaged changes: (none)');
}

// ── Unstaged changes ─────────────────────────────────────────
const unstagedStat = git('diff --stat');
if (unstagedStat) {
  console.log('\nUnstaged changes:\n');
  console.log(unstagedStat);
} else {
  console.log('\nUnstaged changes: (none)');
}

// ── Untracked files ──────────────────────────────────────────
const untracked = statusRaw
  .split('\n')
  .filter(l => l.startsWith('??'))
  .map(l => l.replace(/^\?\?\s+/, '  '))
  .join('\n');
if (untracked) {
  console.log('\nUntracked files:\n');
  console.log(untracked);
}

// ── Commits on this branch not in main ───────────────────────
section('BRANCH COMMITS');

let branchCommits = '';
const bases = ['origin/main', 'main', 'origin/master', 'master'];
for (const base of bases) {
  const result = git(`log ${base}..HEAD --format="%h  %s  (%ci)" 2>/dev/null`);
  if (result) {
    branchCommits = result;
    console.log(`Commits ahead of ${base}:\n`);
    console.log(branchCommits);
    break;
  }
}
if (!branchCommits) {
  console.log('Recent commits (last 5):\n');
  console.log(git('log -5 --format="%h  %s  (%ci)"'));
}

// ── Push reminder ─────────────────────────────────────────────
console.log('');
const trackingBranch = git(`rev-parse --abbrev-ref ${branch}@{upstream} 2>/dev/null`);
if (trackingBranch) {
  const ahead = git(`rev-list --count ${trackingBranch}..HEAD`);
  const behind = git(`rev-list --count HEAD..${trackingBranch}`);
  if (Number(ahead) > 0) {
    console.log(`⚠  ${ahead} commit(s) ahead of ${trackingBranch} — push when ready`);
    console.log(`   git push`);
  } else {
    console.log(`✓  Branch is in sync with ${trackingBranch}`);
  }
  if (Number(behind) > 0) {
    console.log(`⚠  ${behind} commit(s) behind remote — consider pulling`);
  }
} else {
  console.log(`⚠  No remote tracking branch set for '${branch}'`);
  console.log(`   git push -u origin ${branch}`);
}

// ── Session close block ───────────────────────────────────────
section('SESSION END');
console.log(`Completed:
  -

Open:
  -

Next:
  -

PR Updated:
  yes / no
`);

// ── Session record ────────────────────────────────────────────
section('SESSION RECORD');

const today = new Date().toISOString().split('T')[0];

const sessionsDir = join(process.cwd(), 'ai-operations/sessions');
if (!existsSync(sessionsDir)) {
  mkdirSync(sessionsDir, { recursive: true });
}

// Find next available session number for today
let sessionNumber = 1;
let sessionFilename: string;
do {
  const nn = String(sessionNumber).padStart(2, '0');
  sessionFilename = `${today}-session-${nn}.json`;
  if (!existsSync(join(sessionsDir, sessionFilename))) break;
  sessionNumber++;
// eslint-disable-next-line no-constant-condition
} while (true);

const sessionId = `${today}-session-${String(sessionNumber).padStart(2, '0')}`;

// Collect files modified from git status --porcelain
const filesModified: string[] = statusRaw.length > 0
  ? statusRaw
      .split('\n')
      .filter(l => l.trim().length > 0)
      .map(l => {
        const path = l.slice(3);
        const arrowIdx = path.indexOf(' -> ');
        return arrowIdx >= 0 ? path.slice(arrowIdx + 4).trim() : path.trim();
      })
  : [];

// Try to detect open PR for this branch (gh may not be available)
let primaryPr = '';
try {
  primaryPr = execSync(
    `gh pr view --json headRefName --jq '.headRefName' 2>/dev/null`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
} catch {
  primaryPr = '';
}

console.log(`Session ID   : ${sessionId}`);
console.log(`Output file  : ai-operations/sessions/${sessionFilename}`);
console.log('');

// Interactive prompts
const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function collectAndWrite(): Promise<void> {
  const systemsRaw = await ask('systems_advanced (comma-separated IDs, blank for none): ');
  const threadsRaw = await ask('open_threads (comma-separated, blank for none): ');
  const nextMove = await ask('next_move (one line, blank to skip): ');

  rl.close();

  const systemsAdvanced = systemsRaw.trim()
    ? systemsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const openThreads = threadsRaw.trim()
    ? threadsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const record = {
    session_id: sessionId,
    date: today,
    session_number: sessionNumber,
    branch,
    primary_pr: primaryPr,
    systems_advanced: systemsAdvanced,
    files_modified: filesModified,
    open_threads: openThreads,
    next_move: nextMove.trim(),
    agents: ['cursor'],
  };

  const outPath = join(sessionsDir, sessionFilename);
  writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n', 'utf-8');
  console.log(`\n✓  Session record saved: ${outPath}`);
}

collectAndWrite().catch(err => {
  console.error('[session:end] Failed to write session record:', (err as Error).message);
  process.exit(1);
});
