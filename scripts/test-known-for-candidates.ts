import fs from "fs";

const INPUT = process.argv[2];

if (!INPUT) {
  console.error("Usage: tsx scripts/test-known-for-candidates.ts <csv_file>");
  process.exit(1);
}

const raw = fs.readFileSync(INPUT, "utf8");

// normalize Windows + Numbers line endings
const cleaned = raw.replace(/\r/g, "\n");

// split rows
const rows = cleaned.split("\n");

const itemKeywords = [
  "birria",
  "carnitas",
  "mariscos",
  "pastor",
  "barbacoa",
  "shrimp",
  "fish",
  "chorizo"
];

function detectKnownFor(name: string) {
  let score = 0;
  let signals: string[] = [];
  let candidate: string | null = null;

  const lower = name.toLowerCase();

  for (const item of itemKeywords) {
    if (lower.includes(item)) {
      score += 3;
      candidate = item;
      signals.push("item_in_name");
    }
  }

  if (lower.includes("taco")) {
    score += 1;
    if (!candidate) candidate = "tacos";
    signals.push("taco_keyword");
  }

  const confidence = Math.min(score / 7, 1);

  return {
    candidate,
    confidence,
    signals: signals.join("|")
  };
}

const restaurants: string[] = [];

// extract restaurant names automatically
for (const row of rows) {
  const name = row.split(",")[0]?.replace(/"/g, "").trim();

  if (!name || name.toLowerCase() === "name") continue;

  restaurants.push(name);
}

const results = restaurants.map(name => {
  const { candidate, confidence, signals } = detectKnownFor(name);

  return {
    name,
    known_for_candidate: candidate || "",
    confidence: confidence.toFixed(2),
    signals
  };
});

const output = [
  "place,known_for_candidate,confidence,signals",
  ...results.map(
    r =>
      `${r.name},${r.known_for_candidate},${r.confidence},${r.signals}`
  )
].join("\n");

fs.writeFileSync("taco_focus_candidates.csv", output);

console.log(`Generated taco_focus_candidates.csv with ${results.length} places`);