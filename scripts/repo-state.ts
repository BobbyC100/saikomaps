import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

const branch = git('rev-parse --abbrev-ref HEAD');
const statusRaw = git('status --porcelain');
const isDirty = statusRaw.length > 0;
const lastCommitHash = git('log -1 --format=%h');
const lastCommitMessage = git('log -1 --format=%s');
const lastCommitTime = git('log -1 --format=%ci');
const recentCommits = git('log -5 --format="%h %s (%ci)"');

let openPRs = '(none)';
try {
  const raw = execSync(
    'gh pr list --limit=10 --json number,title,state --jq \'.[] | "#\\(.number) \\(.title) [\\(.state)]"\'',
    { encoding: 'utf-8' }
  ).trim();
  if (raw) openPRs = raw;
} catch {
  openPRs = '(gh CLI unavailable or no open PRs)';
}

const now = new Date().toISOString();

const content = `# Repo State

Generated: ${now}

## Branch

${branch}

## Status

${isDirty ? 'DIRTY — uncommitted changes present' : 'CLEAN — working tree is clean'}

## Last Commit

- Hash: ${lastCommitHash}
- Message: ${lastCommitMessage}
- Time: ${lastCommitTime}

## Recent Commits (last 5)

${recentCommits}

## Open Pull Requests

${openPRs}
`;

const outDir = join(process.cwd(), 'ai-operations/state');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'repo_state.md'), content, 'utf-8');
console.log(`[repo:state] repo_state.md updated — ${now}`);
