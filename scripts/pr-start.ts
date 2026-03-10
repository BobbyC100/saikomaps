import { execSync, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function run(cmd: string, opts?: { silent?: boolean }): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: opts?.silent ? 'pipe' : 'pipe' }).trim();
  } catch (e: any) {
    throw new Error(e.stderr?.toString().trim() || e.message);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');
}

function ghAvailable(): boolean {
  try {
    run('gh --version', { silent: true });
    return true;
  } catch {
    return false;
  }
}

const hr = '─'.repeat(56);

function section(title: string) {
  console.log(`\n┌${hr}┐`);
  const pad = hr.length - title.length - 2;
  console.log(`│  ${title}${' '.repeat(pad)}│`);
  console.log(`└${hr}┘\n`);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('PR Goal (one sentence): ', (goal) => {
  goal = goal.trim();
  rl.close();

  if (!goal) {
    console.error('ERROR: PR goal cannot be empty.');
    process.exit(1);
  }

  const slug = slugify(goal);
  if (!slug) {
    console.error('ERROR: Could not generate a valid branch name from the goal.');
    process.exit(1);
  }

  const branchName = `feat/${slug}`;

  section('PR START');
  console.log(`Goal   : ${goal}`);
  console.log(`Branch : ${branchName}`);

  // ── Create branch ────────────────────────────────────────────
  try {
    run(`git checkout -b ${branchName}`);
    console.log(`\n✓ Branch created: ${branchName}`);
  } catch (e: any) {
    console.error(`\nERROR: Could not create branch '${branchName}'`);
    console.error(`  ${e.message}`);
    console.error(`  (Branch may already exist — use: git checkout ${branchName})`);
    process.exit(1);
  }

  // ── PR body ───────────────────────────────────────────────────
  const prBody = `## Goal

${goal}

## Scope

-

## Not in Scope

-

## Implementation Plan

-

## Session Log

-

## Verification

-
`;

  // ── Attempt gh draft PR ───────────────────────────────────────
  if (ghAvailable()) {
    console.log('\nPushing branch to origin...');
    try {
      run(`git push -u origin ${branchName}`);
    } catch (e: any) {
      console.error(`ERROR: Could not push branch to origin.`);
      console.error(`  ${e.message}`);
      process.exit(1);
    }

    const tmpFile = join(tmpdir(), `saiko-pr-body-${Date.now()}.md`);
    writeFileSync(tmpFile, prBody, 'utf-8');

    try {
      const prUrl = run(`gh pr create --draft --title "${goal.replace(/"/g, '\\"')}" --body-file "${tmpFile}"`);
      console.log(`✓ Draft PR created: ${prUrl}`);
    } catch (e: any) {
      console.error(`ERROR: gh pr create failed.`);
      console.error(`  ${e.message}`);
    } finally {
      try { unlinkSync(tmpFile); } catch {}
    }
  } else {
    // gh not available — print manual instructions
    console.log('\n⚠  gh CLI not found. Create the PR manually.\n');
    console.log(`Push command:`);
    console.log(`  git push -u origin ${branchName}\n`);
    console.log(`Then run:`);
    console.log(`  gh pr create --draft --title "${goal}"\n`);
    console.log(`Or open GitHub and create the PR with this description:\n`);
    console.log(prBody);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('');
  console.log(`Ready to build. Next steps:`);
  console.log(`  1. Implement the work`);
  console.log(`  2. git add / git commit`);
  console.log(`  3. npm run session:end`);
  console.log('');
});
