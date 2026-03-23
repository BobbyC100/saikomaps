/**
 * Coverage Source Extraction Prompt
 *
 * Defines the AI extraction prompt and response types for extracting
 * structured signals from archived editorial articles.
 *
 * The extraction maps directly to downstream consumers:
 *   • people          → actor system (PlaceActorRelationship)
 *   • foodEvidence    → food_program + specialty program assemblers
 *   • beverageEvidence → wine/beer/cocktail/NA/coffee_tea programs
 *   • serviceEvidence → service/private_dining/group_dining/catering programs
 *   • atmosphereSignals → derived signals (scene_energy, date_night_probability)
 *   • originStory     → description generation, identity enrichment
 *   • accolades       → trust signals, place page
 *   • pullQuotes      → place page, description generation
 *   • sentiment       → confidence weighting
 *   • articleType      → signal weighting by coverage type
 *   • relevanceScore   → filter low-relevance mentions
 */

// ---------------------------------------------------------------------------
// Types — these mirror the coverage_source_extractions JSON column shapes
// ---------------------------------------------------------------------------

export interface PersonExtraction {
  name: string;
  role: string;   // chef, executive_chef, sous_chef, pastry_chef, sommelier,
                  // beverage_director, wine_director, bartender, general_manager,
                  // foh_director, foh_manager, owner, founder, partner, operator
  context: string; // brief context from article ("opened the restaurant in 2019")
  isPrimary?: boolean;
}

export interface BeverageEvidence {
  wine?: {
    mentioned: boolean;
    listDepth?: string;       // "extensive", "curated", "minimal"
    naturalFocus?: boolean;
    byTheGlass?: string;      // "notable", "standard", "minimal"
    sommelierMentioned?: boolean;
    signals?: string[];       // raw evidence phrases
  };
  cocktail?: {
    mentioned: boolean;
    programExists?: boolean;
    seasonal?: boolean;
    spiritFocus?: string;     // "agave", "whiskey", "gin", etc.
    signals?: string[];
  };
  beer?: {
    mentioned: boolean;
    craftSelection?: boolean;
    tapList?: boolean;
    signals?: string[];
  };
  nonAlcoholic?: {
    mentioned: boolean;
    zeroproof?: boolean;
    houseSodas?: boolean;
    signals?: string[];
  };
  coffeeTea?: {
    mentioned: boolean;
    specialtyProgram?: boolean;
    sourcing?: string;
    signals?: string[];
  };
  rawMentions: string[];      // direct quotes about beverages
}

export interface FoodEvidence {
  cuisinePosture?: string;    // "Japanese", "Mexican-American", "California-Mediterranean", etc.
  cookingApproach?: string[]; // "wood-fired", "fermentation", "from-scratch", "open-flame"
  dishes?: string[];          // specific dishes mentioned
  menuFormat?: string[];      // "tasting-menu", "prix-fixe", "a-la-carte", "omakase", "family-style"
  specialtySignals?: {
    sushi?: { mentioned: boolean; signals?: string[] };
    ramen?: { mentioned: boolean; signals?: string[] };
    taco?: { mentioned: boolean; signals?: string[] };
    pizza?: { mentioned: boolean; signals?: string[] };
    dumpling?: { mentioned: boolean; signals?: string[] };
  };
  rawMentions: string[];      // direct quotes about food
}

export interface ServiceEvidence {
  serviceModel?: string;          // "full-service", "counter", "fast-casual", "fine-dining", "food-truck"
  reservationPosture?: string;    // "essential", "recommended", "walk-in-only", "no-reservations"
  diningFormats?: string[];       // "indoor", "outdoor-patio", "rooftop", "bar-seating", "counter"
  privateDining?: {
    mentioned: boolean;
    roomDescribed?: boolean;
    signals?: string[];
  };
  groupDining?: {
    mentioned: boolean;
    minHeadcount?: number;
    signals?: string[];
  };
  catering?: {
    mentioned: boolean;
    offSite?: boolean;
    signals?: string[];
  };
  hospitalityNotes?: string[];    // service quality observations from the article
  rawMentions: string[];
}

export interface AtmosphereSignals {
  descriptors?: string[];     // "intimate", "industrial", "cozy", "bustling", "dimly-lit"
  energyLevel?: string;       // "high-energy", "relaxed", "lively", "quiet"
  formality?: string;         // "casual", "smart-casual", "upscale", "fine-dining"
}

export interface OriginStory {
  type?: string;              // "chef-journey", "family-legacy", "immigrant-story", "neighborhood-anchor", "concept-driven"
  narrative?: string;         // 2-3 sentence summary
  foundingDate?: string;      // year or date if mentioned
  backstory?: string;         // key details
}

export interface AccoladeEntry {
  name: string;               // "101 Best Restaurants", "Michelin Star", "James Beard Nominee"
  source?: string;            // "LA Times", "Michelin Guide"
  year?: number;
  type: string;               // "list", "award", "star", "nomination", "recognition"
}

export interface PullQuoteEntry {
  text: string;               // the quotable sentence
  context?: string;           // brief context: "on the wine program", "describing the atmosphere"
}

export interface CoverageExtraction {
  people: PersonExtraction[];
  foodEvidence: FoodEvidence;
  beverageEvidence: BeverageEvidence;
  serviceEvidence: ServiceEvidence;
  atmosphereSignals: AtmosphereSignals;
  originStory: OriginStory | null;
  accolades: AccoladeEntry[];
  pullQuotes: PullQuoteEntry[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  articleType: 'review' | 'opening_coverage' | 'list_inclusion' | 'profile' | 'news' | 'closure_news' | 'guide';
  relevanceScore: number; // 0.0–1.0
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const EXTRACTION_SYSTEM_PROMPT = `You are an editorial article analyst for a cultural place-data system. Given an article and a TARGET PLACE NAME, extract structured signals ONLY about that specific place.

CRITICAL — ENTITY SCOPING RULE:
The article may mention many places (e.g., a "25 Best Tacos" list). You MUST extract signals ONLY from paragraphs/sections that discuss the TARGET place. Ignore all other places in the article. If the target place only gets 1-2 sentences in a long list article, your extraction should be correspondingly sparse — that's correct behavior.

Return ONLY a valid JSON object — no markdown, no commentary.

Schema:
{
  "people": [
    {
      "name": "Full Name",
      "role": "<role>",
      "context": "brief context from article",
      "isPrimary": true/false
    }
  ],
  "foodEvidence": {
    "cuisinePosture": "string or null",
    "cookingApproach": ["string"],
    "dishes": ["specific dish names mentioned"],
    "menuFormat": ["tasting-menu", "a-la-carte", etc.],
    "specialtySignals": {
      "sushi": { "mentioned": true, "signals": ["omakase service", "nigiri focus"] },
      "ramen": { "mentioned": false },
      "taco": { "mentioned": false },
      "pizza": { "mentioned": false },
      "dumpling": { "mentioned": false }
    },
    "rawMentions": ["direct quotes about food from the article"]
  },
  "beverageEvidence": {
    "wine": { "mentioned": true, "listDepth": "extensive", "naturalFocus": true, "signals": ["200-bottle list"] },
    "cocktail": { "mentioned": false },
    "beer": { "mentioned": false },
    "nonAlcoholic": { "mentioned": false },
    "coffeeTea": { "mentioned": false },
    "rawMentions": ["direct quotes about beverages"]
  },
  "serviceEvidence": {
    "serviceModel": "full-service",
    "reservationPosture": "essential",
    "diningFormats": ["indoor", "outdoor-patio"],
    "privateDining": { "mentioned": false },
    "groupDining": { "mentioned": false },
    "catering": { "mentioned": false },
    "hospitalityNotes": ["observations about service quality"],
    "rawMentions": ["direct quotes about service"]
  },
  "atmosphereSignals": {
    "descriptors": ["intimate", "dimly-lit"],
    "energyLevel": "relaxed",
    "formality": "smart-casual"
  },
  "originStory": {
    "type": "chef-journey",
    "narrative": "2-3 sentence summary of founding/backstory",
    "foundingDate": "2019",
    "backstory": "key details"
  },
  "accolades": [
    { "name": "101 Best Restaurants", "source": "LA Times", "year": 2024, "type": "list" }
  ],
  "pullQuotes": [
    { "text": "A direct quotable sentence from the article.", "context": "on the pasta program" }
  ],
  "sentiment": "POSITIVE",
  "articleType": "review",
  "relevanceScore": 0.9
}

── People role values ────────────────────────────────────────────────────────
Valid roles: chef, executive_chef, sous_chef, pastry_chef, sommelier, beverage_director, wine_director, bartender, general_manager, foh_director, foh_manager, owner, founder, partner, operator

Rules:
• ONLY extract people who are AFFILIATED with the target place (staff, owners, operators)
• Do NOT extract journalists, critics, food writers, photographers, or article authors — they are NOT affiliated
• Do NOT extract people affiliated with OTHER places mentioned in the same article
• If a person's role does not match any of the valid roles above, OMIT them entirely
• If the article says "chef and owner" for the same person, list them once with the more specific role (chef) and note ownership in context
• isPrimary = true for the lead person in that role (head chef, not sous chef)

── Food evidence ─────────────────────────────────────────────────────────────
cuisinePosture: The primary cuisine identity (e.g., "Japanese", "Mexican", "New American", "Italian-inflected Californian"). Use the article's framing.

cookingApproach: Specific techniques mentioned (wood-fired, open-flame, fermentation, house-made pasta, from-scratch, smoked, etc.)

dishes: Named dishes called out in the article. Max 10.

menuFormat: How the meal is structured. Values: tasting-menu, prix-fixe, a-la-carte, omakase, family-style, counter-order, set-menu

specialtySignals: Only mark "mentioned": true if the article explicitly discusses that specialty. Include evidence phrases.
  • sushi — omakase, nigiri, sashimi, hand rolls, fish sourcing
  • ramen — broth types, noodle styles, toppings system
  • taco — taco types, tortilla details, salsa program, trompo
  • pizza — style (Neapolitan, NY), oven type, dough details
  • dumpling — dumpling types (xiao long bao, gyoza, momo), wrappers

rawMentions: Quote 2-5 sentences about food directly from the article.

── Beverage evidence ─────────────────────────────────────────────────────────
For each beverage category, only populate if the article actually discusses it.

wine.listDepth: "extensive" (many producers/regions), "curated" (intentional small list), "minimal" (few options)
wine.naturalFocus: true if natural/biodynamic/skin-contact wines are highlighted
wine.byTheGlass: "notable" (interesting pours), "standard", "minimal"

cocktail.programExists: true if dedicated cocktail program discussed
cocktail.spiritFocus: primary spirit if one dominates (agave, whiskey, etc.)

rawMentions: Quote 2-3 sentences about beverages directly from the article.

── Service evidence ──────────────────────────────────────────────────────────
serviceModel: "full-service", "counter", "fast-casual", "fine-dining", "food-truck", "pop-up"
reservationPosture: "essential" (hard to book), "recommended", "walk-in-only", "no-reservations"
diningFormats: Physical seating mentioned: "indoor", "outdoor-patio", "rooftop", "bar-seating", "counter", "communal"

hospitalityNotes: Observations about service quality, staff attentiveness, hospitality style. Max 3.

── Atmosphere ────────────────────────────────────────────────────────────────
descriptors: Sensory/spatial words used in the article. Max 6.
energyLevel: "high-energy", "lively", "relaxed", "quiet", "intimate"
formality: "casual", "smart-casual", "upscale", "fine-dining"

── Origin story ──────────────────────────────────────────────────────────────
Return null if no founding/backstory information in the article.
type: "chef-journey", "family-legacy", "immigrant-story", "neighborhood-anchor", "concept-driven", "partnership"
narrative: Concise 2-3 sentence summary of the origin.

── Accolades ─────────────────────────────────────────────────────────────────
type: "list" (best-of list), "award" (James Beard, etc.), "star" (Michelin), "nomination", "recognition"
Only include accolades explicitly mentioned in the article.

── Pull quotes ───────────────────────────────────────────────────────────────
Select 2-5 of the most quotable, descriptive sentences from the article.
These should be vivid, specific, and useful for describing the place.
Do NOT fabricate quotes — extract verbatim from the article text.

── Sentiment ─────────────────────────────────────────────────────────────────
POSITIVE: clearly favorable coverage
NEGATIVE: critical or unfavorable
NEUTRAL: factual/informational without strong opinion
MIXED: both positive and negative elements

── Article type ──────────────────────────────────────────────────────────────
review: a dedicated review of the place
opening_coverage: reporting on a new opening
list_inclusion: the place appears on a "best of" or curated list
profile: a feature/profile of the place or its people
news: general news (expansion, controversy, event)
closure_news: reporting on a closing
guide: neighborhood or cuisine guide

── Relevance score ───────────────────────────────────────────────────────────
Score based on how much substantive content about the TARGET place exists:
0.0–0.1: target place is not actually discussed (name appears only in a URL, sidebar, or unrelated section)
0.2–0.3: single sentence mention with no descriptive detail
0.4–0.5: 1-2 paragraphs with some specific details (typical best-of list entry)
0.6–0.7: multiple paragraphs with dishes, people, or atmosphere described
0.8–0.9: place is a major focus — several sections dedicated to it
1.0: article is entirely about this place (dedicated review or profile)

Important: A place getting its own entry in a "Best Of" list with a descriptive paragraph should score 0.4–0.5, not lower.

General rules:
• Only extract what is explicitly stated in the article
• Do NOT infer signals from cuisine type alone
• Quote evidence directly — do not paraphrase
• Return empty arrays [] for categories with no evidence
• Return null for originStory if no backstory is present
• If the article is very short or mostly a list mention, many fields will be empty — that's correct`;

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

const MAX_CONTENT_CHARS = 20_000;

export function buildExtractionUserMessage(
  entityName: string,
  publicationName: string,
  articleTitle: string | null,
  articleContent: string,
): string {
  const contentSnippet = articleContent.slice(0, MAX_CONTENT_CHARS);
  const truncated = articleContent.length > MAX_CONTENT_CHARS
    ? `\n[...truncated at ${MAX_CONTENT_CHARS} chars]`
    : '';

  let msg = `Place name: ${entityName}\n`;
  msg += `Publication: ${publicationName}\n`;
  if (articleTitle) {
    msg += `Article title: ${articleTitle}\n`;
  }
  msg += `\nArticle text (${articleContent.length} chars total):\n`;
  msg += `---\n${contentSnippet}${truncated}\n---`;
  return msg;
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

export function parseExtractionResponse(raw: string): CoverageExtraction | null {
  // Strip markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Sanitize and provide defaults for all fields
    const result: CoverageExtraction = {
      people: sanitizePeople(parsed.people),
      foodEvidence: sanitizeFoodEvidence(parsed.foodEvidence),
      beverageEvidence: sanitizeBeverageEvidence(parsed.beverageEvidence),
      serviceEvidence: sanitizeServiceEvidence(parsed.serviceEvidence),
      atmosphereSignals: sanitizeAtmosphereSignals(parsed.atmosphereSignals),
      originStory: parsed.originStory && typeof parsed.originStory === 'object'
        ? parsed.originStory
        : null,
      accolades: sanitizeAccolades(parsed.accolades),
      pullQuotes: sanitizePullQuotes(parsed.pullQuotes),
      sentiment: sanitizeSentiment(parsed.sentiment),
      articleType: sanitizeArticleType(parsed.articleType),
      relevanceScore: typeof parsed.relevanceScore === 'number'
        ? Math.max(0, Math.min(1, parsed.relevanceScore))
        : 0,
    };

    return result;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------

const VALID_ROLES = new Set([
  'chef', 'executive_chef', 'sous_chef', 'pastry_chef', 'sommelier',
  'beverage_director', 'wine_director', 'bartender', 'general_manager',
  'foh_director', 'foh_manager', 'owner', 'founder', 'partner', 'operator',
]);

function sanitizePeople(raw: unknown): PersonExtraction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> =>
      typeof p === 'object' && p !== null && typeof p.name === 'string'
      && VALID_ROLES.has(String(p.role))) // drop entries with invalid/unknown roles
    .map((p) => ({
      name: String(p.name).trim(),
      role: String(p.role),
      context: typeof p.context === 'string' ? p.context.trim() : '',
      isPrimary: typeof p.isPrimary === 'boolean' ? p.isPrimary : undefined,
    }));
}

function sanitizeFoodEvidence(raw: unknown): FoodEvidence {
  if (!raw || typeof raw !== 'object') return { rawMentions: [] };
  const r = raw as Record<string, unknown>;
  return {
    cuisinePosture: typeof r.cuisinePosture === 'string' ? r.cuisinePosture : undefined,
    cookingApproach: toStringArray(r.cookingApproach),
    dishes: toStringArray(r.dishes),
    menuFormat: toStringArray(r.menuFormat),
    specialtySignals: r.specialtySignals && typeof r.specialtySignals === 'object'
      ? r.specialtySignals as FoodEvidence['specialtySignals']
      : undefined,
    rawMentions: toStringArray(r.rawMentions),
  };
}

function sanitizeBeverageEvidence(raw: unknown): BeverageEvidence {
  if (!raw || typeof raw !== 'object') return { rawMentions: [] };
  const r = raw as Record<string, unknown>;
  return {
    wine: r.wine && typeof r.wine === 'object' ? r.wine as BeverageEvidence['wine'] : undefined,
    cocktail: r.cocktail && typeof r.cocktail === 'object' ? r.cocktail as BeverageEvidence['cocktail'] : undefined,
    beer: r.beer && typeof r.beer === 'object' ? r.beer as BeverageEvidence['beer'] : undefined,
    nonAlcoholic: r.nonAlcoholic && typeof r.nonAlcoholic === 'object' ? r.nonAlcoholic as BeverageEvidence['nonAlcoholic'] : undefined,
    coffeeTea: r.coffeeTea && typeof r.coffeeTea === 'object' ? r.coffeeTea as BeverageEvidence['coffeeTea'] : undefined,
    rawMentions: toStringArray(r.rawMentions),
  };
}

function sanitizeServiceEvidence(raw: unknown): ServiceEvidence {
  if (!raw || typeof raw !== 'object') return { rawMentions: [] };
  const r = raw as Record<string, unknown>;
  return {
    serviceModel: typeof r.serviceModel === 'string' ? r.serviceModel : undefined,
    reservationPosture: typeof r.reservationPosture === 'string' ? r.reservationPosture : undefined,
    diningFormats: toStringArray(r.diningFormats),
    privateDining: r.privateDining && typeof r.privateDining === 'object'
      ? r.privateDining as ServiceEvidence['privateDining'] : undefined,
    groupDining: r.groupDining && typeof r.groupDining === 'object'
      ? r.groupDining as ServiceEvidence['groupDining'] : undefined,
    catering: r.catering && typeof r.catering === 'object'
      ? r.catering as ServiceEvidence['catering'] : undefined,
    hospitalityNotes: toStringArray(r.hospitalityNotes),
    rawMentions: toStringArray(r.rawMentions),
  };
}

function sanitizeAtmosphereSignals(raw: unknown): AtmosphereSignals {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  return {
    descriptors: toStringArray(r.descriptors),
    energyLevel: typeof r.energyLevel === 'string' ? r.energyLevel : undefined,
    formality: typeof r.formality === 'string' ? r.formality : undefined,
  };
}

function sanitizeAccolades(raw: unknown): AccoladeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> =>
      typeof a === 'object' && a !== null && typeof a.name === 'string')
    .map((a) => ({
      name: String(a.name).trim(),
      source: typeof a.source === 'string' ? a.source : undefined,
      year: typeof a.year === 'number' ? a.year : undefined,
      type: typeof a.type === 'string' ? a.type : 'recognition',
    }));
}

function sanitizePullQuotes(raw: unknown): PullQuoteEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is Record<string, unknown> =>
      typeof q === 'object' && q !== null && typeof q.text === 'string')
    .map((q) => ({
      text: String(q.text).trim(),
      context: typeof q.context === 'string' ? q.context : undefined,
    }));
}

const VALID_SENTIMENTS = new Set(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED']);
function sanitizeSentiment(raw: unknown): CoverageExtraction['sentiment'] {
  const val = typeof raw === 'string' ? raw.toUpperCase() : '';
  return VALID_SENTIMENTS.has(val) ? val as CoverageExtraction['sentiment'] : 'NEUTRAL';
}

const VALID_ARTICLE_TYPES = new Set([
  'review', 'opening_coverage', 'list_inclusion', 'profile', 'news', 'closure_news', 'guide',
]);
function sanitizeArticleType(raw: unknown): CoverageExtraction['articleType'] {
  const val = typeof raw === 'string' ? raw.toLowerCase() : '';
  return VALID_ARTICLE_TYPES.has(val) ? val as CoverageExtraction['articleType'] : 'news';
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
