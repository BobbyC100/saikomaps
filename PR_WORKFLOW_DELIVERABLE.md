# PR Workflow End-to-End — Deliverable

**Back to Bobby — single action to create all PRs (no manual GitHub work):**

1. Create a GitHub Personal Access Token with `repo` scope (Settings → Developer settings → Personal access tokens).
2. In the project root run:  
   **`GITHUB_TOKEN=<paste-token-here> ./scripts/create-prs.sh`**  
   That creates all 3 PRs with titles and descriptions.
3. On GitHub, merge in order: PR 1 → PR 2 → PR 3. After **each** merge run: **`./scripts/post-merge-verify.sh`**. If it fails, fix the build before the next merge.

If you prefer not to use a token: open the three “Compare” URLs in Step 1 Option C below and paste the title/body from `scripts/create-prs.sh` (or the sections in this doc).

---

**Branches (already pushed):**
1. `chore/auth-wrapup` (6ff3712)
2. `chore/visual-alignment-pass` (e80a9a6)
3. `feat/password-recovery` (f3420b9)

---

## Step 1 — Create PRs (no manual GitHub work)

**Option A — One command (recommended)**  
Set a GitHub token with `repo` scope, then run:

```bash
GITHUB_TOKEN=<your-token> ./scripts/create-prs.sh
```

This creates all 3 PRs with titles and descriptions. No need to open GitHub in the browser.

**Option B — Use GitHub CLI**  
If you use `gh`:

```bash
gh auth login
./scripts/create-prs.sh
```

**Option C — Manual (only if no token)**  
Open each URL and paste the title/body from the sections below:

| Branch | Create PR URL |
|--------|----------------|
| 1. auth-wrapup | https://github.com/BobbyC100/saikomaps/compare/main...chore/auth-wrapup?expand=1 |
| 2. visual-alignment-pass | https://github.com/BobbyC100/saikomaps/compare/main...chore/visual-alignment-pass?expand=1 |
| 3. password-recovery | https://github.com/BobbyC100/saikomaps/compare/main...feat/password-recovery?expand=1 |

---

## PR links (after creation)

Once PRs exist, they will be:

- **PR 1:** `https://github.com/BobbyC100/saikomaps/pull/<n1>` (chore/auth-wrapup)
- **PR 2:** `https://github.com/BobbyC100/saikomaps/pull/<n2>` (chore/visual-alignment-pass)
- **PR 3:** `https://github.com/BobbyC100/saikomaps/pull/<n3>` (feat/password-recovery)

Replace `<n1>`, `<n2>`, `<n3>` with the actual PR numbers from the repo.

---

## Step 2 — Merge order (strict)

Merge in this order only:

1. **chore/auth-wrapup**
2. **chore/visual-alignment-pass**
3. **feat/password-recovery**

If Cursor/permissions cannot merge: merge PR 1, then PR 2, then PR 3 from the GitHub UI (one merge per PR).

---

## Step 3 — Post-merge verification

After **each** merge, run:

```bash
./scripts/post-merge-verify.sh
```

This does: `git checkout main && git pull origin main && npm install && npm run build`.

- If the script exits **0**: build OK; continue to the next merge.
- If it **fails**: stop, note the error and fix before merging the next PR.

---

## Step 4 — Password recovery env

- If `RESEND_API_KEY` is not set in production: forgot-password still returns **200** and does not send email (fails gracefully).
- Required env is documented in **README** and **.env.example** (RESEND_API_KEY, RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL).

No change required for merge.

---

## Single action for Bobby (if you can’t merge via API)

1. Run once to create all PRs:  
   `GITHUB_TOKEN=<token> ./scripts/create-prs.sh`
2. Then on GitHub, click **Merge** on PR 1 → run `./scripts/post-merge-verify.sh` → **Merge** on PR 2 → run verify again → **Merge** on PR 3 → run verify again.

---

## Status summary

| Item | Status |
|------|--------|
| **Current main (baseline)** | **Build: OK** (verified) |
| PR 1 (auth-wrapup) | Not created yet — run `GITHUB_TOKEN=xxx ./scripts/create-prs.sh` |
| PR 2 (visual-alignment-pass) | Not created yet |
| PR 3 (password-recovery) | Not created yet |
| Build after merge 1 | Pending (run `./scripts/post-merge-verify.sh` after merging PR 1) |
| Build after merge 2 | Pending |
| Build after merge 3 | Pending |
| Follow-up required | None unless a post-merge build fails |

---

**Prepared titles/bodies** are in `scripts/create-prs.sh`; the script uses them when creating PRs via API or `gh`.
