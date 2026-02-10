#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync, execSync } from "child_process";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

function readStdin() {
  if (process.stdin.isTTY) return null;
  try { return fs.readFileSync(0, "utf8"); } catch { return null; }
}

function readClipboard() {
  try { return execSync("pbpaste", { encoding: "utf8" }); } catch { return ""; }
}

function parseLines(text) {
  const updates = [];
  const errors = [];
  const lines = (text || "")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));

  for (const line of lines) {
    const parts = line.includes("|")
      ? line.split("|").map(s => s.trim())
      : line.split(/\s+/).map(s => s.trim());

    const slug = parts[0];
    const handleRaw = parts[1];
    if (!slug || !handleRaw) {
      errors.push(`Bad line (need: "slug handle"): ${line}`);
      continue;
    }

    let handle = handleRaw
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/\/.*/, "")
      .trim();

    if (!handle) {
      errors.push(`Bad handle on line: ${line}`);
      continue;
    }

    updates.push({ slug, instagram: handle });
  }

  return { updates, errors };
}

function writeTempJson(updates) {
  const tmpPath = path.join(os.tmpdir(), `saiko-ig-bulk-${Date.now()}.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(updates, null, 2));
  return tmpPath;
}

function runUpdate(tempJsonPath) {
  const res = spawnSync("node", ["scripts/update-instagram.js", "--update", tempJsonPath], { stdio: "inherit" });
  process.exit(res.status ?? 0);
}

let input = readStdin();
if (input == null) input = readClipboard();

if (!input || !input.trim()) {
  console.error("❌ No input found.");
  console.error("   Copy lines like `slug handle` to clipboard, then run:");
  console.error("   node scripts/bulk-update-instagram.js");
  console.error("   Or pipe input:");
  console.error("   pbpaste | node scripts/bulk-update-instagram.js");
  process.exit(1);
}

const { updates, errors } = parseLines(input);

if (errors.length) {
  console.error("⚠️ Some lines were skipped:");
  for (const e of errors.slice(0, 20)) console.error("  - " + e);
  if (errors.length > 20) console.error(`  ... plus ${errors.length - 20} more`);
  console.error("");
}

console.log(`📦 Prepared ${updates.length} updates`);

if (!updates.length) {
  console.error("❌ No valid updates to apply.");
  process.exit(1);
}

const tempJsonPath = writeTempJson(updates);

if (DRY_RUN) {
  console.log(`🧪 Dry run only. JSON written to: ${tempJsonPath}`);
  console.log(fs.readFileSync(tempJsonPath, "utf8"));
  process.exit(0);
}

runUpdate(tempJsonPath);
