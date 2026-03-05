import fs from "node:fs";

const patchLog = "docs/ui/place-page/patch-log.md";
const cssFile = "app/(viewer)/place/[slug]/place.css";

function fail(msg) {
  console.error(`\n[place-page-guardrail] ${msg}\n`);
  process.exit(1);
}

if (!fs.existsSync(patchLog)) fail(`Missing ${patchLog}`);
if (!fs.existsSync(cssFile)) fail(`Missing ${cssFile}`);

const css = fs.readFileSync(cssFile, "utf8");

if (!css.includes("#place-page") || !css.includes("--pp-")) {
  fail(`Expected token block "#place-page { --pp-* }" in ${cssFile}`);
}

const tokenUses = (css.match(/var\(--pp-[a-z0-9-]+\)/gi) || []).length;
if (tokenUses < 25) {
  fail(`Expected >= 25 token usages (var(--pp-*)); found ${tokenUses}.`);
}

console.log(`[place-page-guardrail] OK: token block present, ${tokenUses} token usages`);
