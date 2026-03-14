import { chromium, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const urls = [
  "https://la.eater.com/2023/7/11/23791313/michelin-bib-gourmand-los-angeles-2023",
  "https://la.eater.com/2024/8/5/24214294/michelin-bib-gourmand-2024-los-angeles",
  "https://la.eater.com/restaurant-news/285741/michelin-bib-gourmand-2025-los-angeles",
  "https://la.eater.com/2023/6/6/23750210/los-angeles-restaurants-james-beard-awards-winners-ceremony-chefs",
  "https://www.jamesbeard.org/stories/the-2024-james-beard-award-winners",
  "https://la.eater.com/2024/6/11/24175874/james-beard-foundation-awards-2024-winners-los-angeles",
  "https://la.eater.com/2025/4/2/24399234/los-angeles-james-beard-foundation-award-nominees-2025",
  "https://www.timeout.com/los-angeles/restaurants/best-restaurants-in-los-angeles",
  "https://www.opentable.com/blog/category/la-awards/",
  "https://eattheworldla.substack.com/t/eastside",
];

type RawRow = {
  place_name: string;
  source_publication: string;
  article_title: string;
  article_url: string;
  year: string;
  source_type: string;
  source_signal: string;
};

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function getYearFromUrl(url: string): string {
  const m = url.match(/20\d{2}/);
  return m ? m[0] : "";
}

function getSourcePublication(url: string): string {
  if (url.includes("la.eater.com")) return "Eater LA";
  if (url.includes("jamesbeard.org")) return "James Beard Foundation";
  if (url.includes("timeout.com")) return "Time Out";
  if (url.includes("opentable.com")) return "OpenTable";
  if (url.includes("substack.com")) return "Substack";
  return new URL(url).hostname;
}

function getSourceType(url: string): string {
  if (url.includes("michelin")) return "Guide";
  if (url.includes("james-beard")) return "Awards";
  if (url.includes("timeout.com")) return "Editorial";
  if (url.includes("eater.com")) return "Editorial";
  if (url.includes("opentable.com")) return "Editorial";
  if (url.includes("substack.com")) return "Editorial";
  return "Editorial";
}

function getSourceSignal(url: string, title: string): string {
  const hay = `${url} ${title}`.toLowerCase();

  if (hay.includes("bib-gourmand")) return "Michelin Bib Gourmand";
  if (hay.includes("james-beard") && hay.includes("winner")) return "James Beard Winner";
  if (hay.includes("james-beard") && hay.includes("nominee")) return "James Beard Nominee";
  if (hay.includes("best-restaurants")) return "Best Restaurants List";
  if (hay.includes("awards")) return "Awards List";

  return "Editorial Mention";
}

function csvEscape(value: string): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function cleanTimeOutName(raw: string): string {
  let s = normalizeWhitespace(raw);

  s = s.replace(/\s*Photograph:.*$/i, "").trim();

  const exactFixes: Record<string, string> = {
    "Park’s": "Park’s BBQ",
    "Dulan’s": "Dulan’s Soul Food Kitchen",
    "Anajak": "Anajak Thai",
    "Luv2eat": "Luv2eat Thai Bistro",
  };

  if (exactFixes[s]) return exactFixes[s];

  const suffixes = [
    "Steakhouse Hancock Park",
    "Trucks Boyle Heights",
    "Trucks Mid City",
    "Pizza Westside",
    "Californian LAX/Westchester",
    "Persian Silver Lake",
    "Brasseries Downtown Arts District",
  ];

  for (const suffix of suffixes) {
    if (s.endsWith(suffix)) s = s.slice(0, -suffix.length).trim();
  }

  s = s.replace(/\s+Delis?\s+Westlake.*$/i, "").trim();
  s = s.replace(/\s+price\s+\d.*$/i, "").trim();
  s = s.replace(/\s+\d+\s+out of\s+\d+\s+stars.*$/i, "").trim();
  s = s.replace(/\s+Recommended.*$/i, "").trim();

  return s;
}

async function getArticleTitle(page: Page): Promise<string> {
  const title = await page.title();
  return normalizeWhitespace(title.replace(/\s*\|\s*.*$/, ""));
}

async function parseTimeOut(page: Page): Promise<string[]> {
  const cards = await page.locator("article").allInnerTexts();

  const names = cards
    .map((text) => normalizeWhitespace(text))
    .map((text) => {
      const match = text.match(
        /^\d+\.\s*(.+?)(?=(Japanese|Thai|Korean|Mexican|Seafood|Mediterranean|French|Italian|Chinese|Filipino|American|Oaxacan|Taiwanese|Soul Food|BBQ|Pizza|Persian|Californian|Brasseries|Steakhouse|Trucks|Delis|What is it\?|Photograph:))/i
      );
      return match ? cleanTimeOutName(match[1].trim()) : null;
    })
    .filter((x): x is string => Boolean(x));

  return uniq(names).filter(Boolean);
}

function splitConcatenatedNames(s: string): string[] {
  const results: string[] = [];
  const matches = s.match(/[A-ZÀ-ÖØ-Ýa-z0-9'’.\/&+\-]+(?:\s+[A-ZÀ-ÖØ-Ýa-z0-9'’.\/&+\-]+)*/g) || [];
  for (const m of matches) {
    const cleaned = normalizeWhitespace(m);
    if (cleaned.length >= 3 && cleaned.length <= 60) results.push(cleaned);
  }
  return results;
}

function isLikelyPlaceName(s: string): boolean {
  const bannedExact = new Set([
    "LA Restaurant News",
    "Featured Stories",
    "Most Popular",
    "GO TO PAGE",
    "Terms",
    "Privacy Notice",
    "Privacy Policy",
    "Terms of Service",
    "Matthew Kang",
    "Kang Town",
    "Visit California",
    "Atlanta",
    "Florida",
    "Colorado",
    "Thailand",
    "South Korea",
    "External Link",
    "Book online",
    "Order online",
    "Read review",
    "Address:",
    "Opening hours:",
    "What is it?",
    "Why we love it:",
    "Time Out tip:",
    "Mian",
    "Carla Torres",
  ]);

  if (bannedExact.has(s)) return false;
  if (s.length < 3 || s.length > 80) return false;
  if (/^\d+\./.test(s)) return false;
  if (/^(The|This|That|Here|According|Don’t|Check Out)/i.test(s)) return false;
  if (/http|@|Phone\(|Location|Link/i.test(s)) return false;
  if (/(newsletter|privacy|policy|advertiser|email|required|sign up|featured stories)/i.test(s)) return false;
  if (/(best restaurants|best pies|hottest new restaurants|palm springs|santa monica restaurants)/i.test(s)) return false;
  if (/^(affordable|selected from the LA area|announced a number|funded in part by|state’s tourism board)$/i.test(s)) return false;

  return true;
}

async function parseEater(page: Page): Promise<string[]> {
  const bodyText = normalizeWhitespace(await page.locator("main").innerText());

  const extracted: string[] = [];

  const newBibMatch = bodyText.match(
    /Here are the new Bib Gourmands(?: for \d{4})? in Los Angeles:([A-Za-zÀ-ÖØ-öø-ÿ0-9'’.&+\/\-\s]+?)According to the Michelin Guide/i
  );
  if (newBibMatch?.[1]) {
    extracted.push(...splitConcatenatedNames(newBibMatch[1]));
  }

  const discoveriesMatch = bodyText.match(
    /including ([A-Za-zÀ-ÖØ-öø-ÿ0-9'’.&+\/\-,\s]+?), the latter/i
  );
  if (discoveriesMatch?.[1]) {
    discoveriesMatch[1]
      .split(",")
      .map((s) => normalizeWhitespace(s))
      .forEach((s) => extracted.push(s));
  }

  const linkTexts = await page.$$eval("article a", (els) =>
    els.map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean)
  );

  for (const text of linkTexts) {
    if (isLikelyPlaceName(text)) extracted.push(text);
  }

  return uniq(extracted.filter(isLikelyPlaceName));
}

async function parseJamesBeard(page: Page): Promise<string[]> {
  const texts = await page.$$eval("main h2, main h3, main h4, main p, main li, main a", (els) =>
    els.map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean)
  );

  const names: string[] = [];

  for (const text of texts) {
    if (!isLikelyPlaceName(text)) continue;
    if (text.includes(" — ")) continue;
    if (text.includes(":")) continue;
    if (/(foundation|award|winner|nominee|best chef|outstanding)/i.test(text)) continue;
    names.push(text);
  }

  return uniq(names);
}

async function parseOpenTable(page: Page): Promise<string[]> {
  const texts = await page.$$eval("main h1, main h2, main h3, main h4, main a", (els) =>
    els.map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean)
  );

  return uniq(texts.filter(isLikelyPlaceName));
}

async function parseSubstack(page: Page): Promise<string[]> {
  const texts = await page.$$eval("main h1, main h2, main h3, main strong, main a, main li", (els) =>
    els.map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean)
  );

  return uniq(texts.filter(isLikelyPlaceName));
}

async function parseUrl(page: Page, url: string): Promise<RawRow[]> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  const articleTitle = await getArticleTitle(page);
  const sourcePublication = getSourcePublication(url);
  const year = getYearFromUrl(url);
  const sourceType = getSourceType(url);
  const sourceSignal = getSourceSignal(url, articleTitle);

  let names: string[] = [];

  if (url.includes("timeout.com")) {
    names = await parseTimeOut(page);
  } else if (url.includes("la.eater.com")) {
    names = await parseEater(page);
  } else if (url.includes("jamesbeard.org")) {
    names = await parseJamesBeard(page);
  } else if (url.includes("opentable.com")) {
    names = await parseOpenTable(page);
  } else if (url.includes("substack.com")) {
    names = await parseSubstack(page);
  }

  return names.map((place_name) => ({
    place_name,
    source_publication: sourcePublication,
    article_title: articleTitle,
    article_url: url,
    year,
    source_type: sourceType,
    source_signal: sourceSignal,
  }));
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const rows: RawRow[] = [];

  for (const url of urls) {
    console.log(`Parsing: ${url}`);
    try {
      const parsed = await parseUrl(page, url);
      rows.push(...parsed);
      console.log(`  -> ${parsed.length} rows`);
    } catch (err) {
      console.error(`  -> FAILED: ${url}`);
      console.error(err);
    }
  }

  await browser.close();

  const dedupedRows = rows.filter(
    (row, idx, arr) =>
      idx ===
      arr.findIndex(
        (r) =>
          r.place_name === row.place_name &&
          r.article_url === row.article_url
      )
  );

  const outDir = path.join(process.cwd(), "data", "exports");
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "raw-place-provenance.json");
  await fs.writeFile(jsonPath, JSON.stringify(dedupedRows, null, 2), "utf8");

  const csvHeader = [
    "place_name",
    "source_publication",
    "article_title",
    "article_url",
    "year",
    "source_type",
    "source_signal",
  ];

  const csvLines = [
    csvHeader.join(","),
    ...dedupedRows.map((row) =>
      [
        row.place_name,
        row.source_publication,
        row.article_title,
        row.article_url,
        row.year,
        row.source_type,
        row.source_signal,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  const csvPath = path.join(outDir, "raw-place-provenance.csv");
  await fs.writeFile(csvPath, csvLines.join("\n"), "utf8");

  console.log(`\nWrote: ${jsonPath}`);
  console.log(`Wrote: ${csvPath}`);
  console.log(`Total rows: ${dedupedRows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});