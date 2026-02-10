# Saiko Maps V1 Search UX and SEO Report

## Search intent, indexed entities, and field strategy

Saiko Maps V1’s search has a specific product job: users arrive via a shared map or place, then search becomes the “see more” escape hatch. In comparable products, search is rarely a single-entity lookup: it spans multiple entity types (for example, entity["company","Spotify","music streaming platform"] search covers songs, albums, artists, playlists, podcasts, etc.). citeturn3search6 This supports your decision to return **both Maps and Places**, while keeping each type legible.

A low-risk V1 indexing strategy is to treat **Maps** and **Places** as two first-class searchable entities and keep their retrieval pipelines separate (even if they share a UI). This matches how multi-type search experiences typically stay understandable: users recognize “what kind of thing” they’re looking at before they judge relevance.

**Indexed entities and recommended searchable fields (V1)**  
Use field choices that (a) reflect user mental models and (b) can be ranked deterministically.

- **Maps (curations / collections of places)**  
  Index fields that identify a map as a named artifact and support fast disambiguation:
  - Title (highest weight)
  - Tagline / short description (medium weight)
  - Neighborhood / area labels (if present; medium weight)
  - Author display name and author type (low weight; mostly for display and tie-breaks)
  - Place count (not for text match; for display + tie-breaking)
  This aligns with how entity["company","Notion","productivity app"] describes “Best Matches” behavior: titles tend to matter more than body/content, and recency can influence ordering. citeturn2search12

- **Places (merchant pages)**  
  Index the few fields users actually type:
  - Place name (highest weight)
  - Neighborhood (medium weight)
  - Category / cuisine / type (medium weight)
  - City (if multi-city later; medium weight)
  For structured “business-like” place pages, consider keeping address and hours out of text matching unless you explicitly need them; they can be present on the page for SEO/UX without driving query relevance. citeturn1search5turn1search1

A practical V1 constraint: don’t index “places within a map” as text matching unless it’s very cheap to implement. It’s valuable, but it makes relevance harder to explain unless you clearly label why a map matched (e.g., “Matches: Maru Coffee”). If you add this later, it becomes a V2 relevance upgrade rather than a launch dependency.

**Diagram: V1 search retrieval model (recommended)**

```
Query q
  ├─ Normalize (trim, collapse whitespace, lowercase for match)
  ├─ Retrieve Maps (title/description/area) → rank Maps
  └─ Retrieve Places (name/neighborhood/category) → rank Places

Render results as:
  [Maps section] + [Places section]
(no cross-type “one list” ranking)
```

This design deliberately avoids requiring a single “perfect” global ranking model across heterogeneous entities.

## Result types, visual separation, and card content

### Result types and separation

Best practice for mixed-entity search is to make entity types **visually and structurally explicit**, rather than trying to solve confusion with ranking alone. You see this in multi-entity search systems like Spotify’s, where search is framed as a single entry point yet spans distinct result types. citeturn3search6

For Saiko, the safest V1 pattern is:

- One `/search?q=...` page (single destination)
- Two primary, clearly labeled sections:
  - **Maps**
  - **Places**
- Avoid a single interleaved list where maps and places “compete.” This keeps the system explainable and reduces “why did this beat that?” distrust.

### Card content

Search cards should answer two questions in under a second:
- What is this?
- Why should I click it?

A useful way to pressure-test card content is to ensure every element either (a) disambiguates or (b) motivates.

**Map card (your locked fields are strong)**  
Your locked fields map cleanly to this principle:
- Title (primary recognition)
- Tagline (why it exists)
- Hero image (emotional hook; “this feels like…”)
- Place count (the “this is a collection” anchor)
- Author (trust signal; editorial vs personal)
- Neighborhood/area (disambiguation)

To reinforce “collection, not a single spot,” the **place count must be legible without reading the footer**. Put it near the type label (e.g., “Map · 8 places”), not buried. The emphasis on type/shape recognition parallels why autocomplete and typeahead patterns must be visually distinct from the user’s own query text: clear differentiation prevents misinterpretation. citeturn3search7turn4search0

**Place card (baseline)**
- Name
- Category + neighborhood line (single line)
- Photo (if available)
- Optional: price tier, but only if it is reliably populated and meaningful

Avoid badge overload in V1. The goal is calm scannability; novelty belongs in the map content itself, not in search UI chrome.

## Ranking heuristics, editorial boosts, and relevance explainability

### Core ranking principles

Across modern search systems, lexical relevance dominates first, then business logic refines ordering. entity["company","Algolia","search-as-a-service company"] documents this explicitly: typo tolerance and matching quality drive ordering before custom ranking signals are applied. citeturn1search0turn6view0

A robust, explainable V1 heuristic stack for each entity type:

**Places ranking (recommended)**
1. Exact match on name (case-insensitive)
2. Starts-with match on name
3. High-similarity fuzzy match (trigram similarity or engine-specific typo tolerance)
4. Tie-breakers:
   - neighborhood match present
   - category match present
   - lightweight popularity signal (if you already have it; otherwise skip in V1)

**Maps ranking (recommended)**
1. Exact match on map title
2. Starts-with match on title
3. Title contains
4. Description contains
5. Tie-breakers:
   - editorial preference only as a gentle nudge (see below)
   - popularity (views, shares) if instrumented
   - recency (published date) only as a tie-breaker, not a primary driver

This resembles Notion’s approach where “Best Matches” favors stronger relevance signals like titles over content, with recency influencing ordering. citeturn2search12

### Fuzzy matching: trigram similarity vs typo tolerance

If you implement fuzzy matching in-database, entity["organization","PostgreSQL","open source database"]’s `pg_trgm` extension is the canonical V1 tool: it provides similarity functions/operators based on trigram matching and index operator classes to speed similarity search. citeturn0search2turn0search5

If you use a search engine, typo tolerance becomes a first-class relevance dimension. Algolia explicitly notes typo count as a leading ranking criterion. citeturn1search0turn1search17 entity["company","Typesense","open source search engine"] also supports typo tolerance and exposes ranking/relevance tuning parameters. citeturn0search6turn0search10

### Editorial boosts for Saiko-authored maps

Editorial boosts are powerful, but dangerous if they feel like rigging. Algolia’s custom ranking documentation frames custom metrics (popularity, ratings, etc.) as a way to increase visibility of “most important content,” and explicitly calls out popularity/rating as typical ranking attributes. citeturn6view0

For Saiko V1, the best practice is:
- **Do not hard-pin Saiko-authored maps to the top.**
- Use an editorial boost only as a **tie-breaker** among already-relevant maps.
- Ensure user-authored maps can win on stronger textual matches.

This keeps search honest while still letting editorial content feel discoverable.

**Diagram: explainable ranking layers**

```
Text match quality (exact/prefix/contains/fuzzy)
  → Section-level ordering (Maps vs Places)
    → Tie-breakers (popularity, recency, editorial boost)
      → Render cards with clear type labels
```

Explainability here is a product feature: users tolerate imperfect ranking if the system’s “shape” is legible.

## Empty states and query-to-creation prompts

V1 search needs graceful failure handling because “no results” is a common first-time experience in young catalogs. Baymard’s ongoing search UX research emphasizes that search UX often fails users in predictable ways; autocomplete and query guidance are common conventions, but they’re frequently implemented poorly. citeturn4search0turn4search22

For Saiko, the best V1 pattern is a **two-path empty state**:
- Primary message: “No results for ‘{q}’”
- Action 1: “Try another search” (focus the search bar)
- Action 2: “Create” (route to map creation)

This is a “query-to-creation” bridge: when discovery fails, creation becomes the natural next action instead of a marketing push. It also prevents dead ends on shared-link-first traffic.

Analytics should explicitly track:
- `search_no_results` (q, entity sections empty)
- `search_create_cta_clicked` (q, entry page)
These event categories mirror the kinds of interaction tracking that search platforms recommend for improving relevance over time: Algolia’s Insights API is designed to capture click/conversion/view events to unlock analytics, personalization, and smarter results. citeturn4search3turn4search7

## URL design, SEO rules, structured data, and social previews

### Search URLs and indexing controls

You’ve locked `/search?q=...` as the canonical results URL. From an SEO perspective, internal search results pages are usually **not** pages you want indexed, because query permutations create near-infinite, low-value URLs and can become spam attack surfaces.

Google’s documentation is clear that `noindex` must be implemented via meta tag or HTTP header, and that Google does **not** support specifying `noindex` in `robots.txt`. It also notes that for `noindex` to be effective, the page must be crawlable (not blocked by `robots.txt`) so the crawler can see the directive. citeturn0search0turn9search1

In addition, Google has explicitly discussed abuse patterns where internal search results can be exploited for spam, including internal search results where the query is off-topic and used to promote third-party sites. citeturn9search16turn9search20

**V1 SEO rule for `/search`**
- Serve `/search?q=...` with:
  - `<meta name="robots" content="noindex,follow">` (or `X-Robots-Tag: noindex`) citeturn0search0turn0search1
- Do **not** block `/search` in `robots.txt` if your goal is reliable deindexing; blocking can prevent crawling and therefore prevent discovery of the `noindex` directive. citeturn0search0turn9search1

### Canonicals and parameter hygiene

If Saiko introduces any URL variants (tracking params, alternate slugs), canonicalization should consolidate them. Google recommends using `rel="canonical"` and related methods to indicate the preferred URL for duplicate or very similar pages. citeturn4search2turn4search6

For Saiko, the practical approach is:
- `/map/[slug]` and `/place/[slug]` should be self-canonical (canonical points to itself)
- Trackable variants (UTMs) should still canonicalize back to the clean slug URL

### Destination pages as SEO surfaces: `/map` and `/place`

Your SEO surfaces should be the pages users actually want in web search:
- `/map/[slug]` (editorial/curated landing pages)
- `/place/[slug]` (evergreen local-intent pages)

Structured data is a strong fit for both surfaces. Google’s structured data policies and intro documentation emphasize that structured data helps search engines understand page content, prefers JSON-LD, and warns not to block pages you want eligible for rich results with robots/noindex. citeturn1search2turn1search6

**Place pages (`/place/[slug]`)**
- Use `LocalBusiness` / `Place` structured data (Schema.org) where applicable. citeturn1search1turn1search11
- Google’s Local Business structured data guidance highlights that it can surface business details like hours and other attributes in search experiences. citeturn1search5

**Map pages (`/map/[slug]`)**
- Use an `ItemList` to represent the ordered/unordered list of places included in the map. citeturn1search8  
This won’t guarantee a special rich result, but it strengthens machine understanding and can support future presentation improvements, consistent with Google’s “structured data helps understanding, not guarantees features” guidance. citeturn1search2turn1search6

### Social preview and OG images

Given “shared-link-first,” social previews are part of the core product loop. The Open Graph protocol defines core tags like `og:title`, `og:type`, `og:image`, and `og:url`, and recommends including image alt text via `og:image:alt`. citeturn1search3

If Saiko is deployed on a platform that supports server-side OG image generation, Vercel’s `@vercel/og` documentation describes generating dynamic OG images and reiterates the common recommended size (1200×630). citeturn1search36

V1 best practice is to generate share cards for:
- Map pages: title + hero image + “X places” + author
- Place pages: name + neighborhood/category + one strong photo

## Technical options, trade-offs, and implementation notes

### Options overview

Saiko’s V1 needs are straightforward:
- low-to-moderate dataset size
- high perceived speed
- explainable behavior
- minimal operational burden

These requirements make it reasonable to start in the database (especially if you already have Postgres) and migrate when scale or UX demands grow.

### Comparison table: V1 search backends

| Option | Typical latency profile | Cost model | Operational complexity | Key features | Best fit for Saiko V1 |
|---|---:|---|---|---|---|
| Plain SQL `ILIKE` | OK for small datasets; degrades quickly without indexes | DB-only | Low | Simple substring match; limited ranking | Only for very small catalogs / prototype stage |
| Postgres + `pg_trgm` | Fast fuzzy matching with proper indexes | DB-only | Low–Medium | Trigram similarity + index support for similarity search citeturn0search2 | Strong default V1 choice (simple, explainable) |
| Typesense (self-host or cloud) | Designed for low-latency, in-memory index; published benchmarks show ~11–28ms average processing time in tests citeturn5search7turn5search39 | Infra cost (self-host) or hourly SaaS citeturn5search1turn5search9 | Medium | Typo tolerance, facets/filters, relevance tuning citeturn0search3turn0search6 | Good V1.5/V2 when you want fast typeahead + facets |
| Algolia (hosted) | Marketed for very fast global performance; emphasizes sub-100ms UX targets citeturn5search6 | Pay-as-you-go per records + requests citeturn5search0turn5search4 | Low (ops), Medium (configuration) | Strong typo tolerance + ranking criteria + custom ranking + analytics/events citeturn1search0turn6view0turn4search3 | Good when you want turnkey instant search + analytics + personalization |

### Implementation notes by option

**Postgres + pg_trgm (recommended V1 baseline)**  
- Enable extension (`pg_trgm`) for similarity search. citeturn0search2  
- Add GIN/GiST trigram indexes on high-importance fields (places.name, maps.title). Third-party technical guidance commonly notes trigram indexes can also accelerate `LIKE/ILIKE` patterns. citeturn0search5  
- Rank with a deterministic function (exact, prefix, similarity score) and keep tie-breakers lightweight.

**Typesense**  
- Define which fields are queryable (`query_by`) and which fields are facets for filters; Typesense’s API centers around querying text fields plus filterable fields. citeturn0search3  
- Plan memory carefully because Typesense keeps the index in RAM for low latency. citeturn5search39  
- Adopt facets/filters only when V1 product scope justifies UI complexity.

**Algolia**  
- Configure searchable attributes and understand ranking criteria: typo tolerance and tie-breaking are explicit parts of the model. citeturn1search17turn6view0  
- If you want popularity-based ordering, custom ranking is a first-class approach (popularity/ratings/likes are typical). citeturn6view0  
- Instrument event analytics early if you want relevance improvements later; Algolia’s Insights API is designed for click/conversion/view tracking. citeturn4search3turn4search7

## Accessibility, analytics instrumentation, and V1-to-V2 migration path

### Accessibility

V1’s “Enter → results page” pattern is accessibility-friendly because it avoids the complexities of interactive suggestion popups. If/when Saiko adds autocomplete, it becomes a combobox pattern with strict keyboard and ARIA requirements. The WAI-ARIA Authoring Practices define combobox behavior and include a list-autocomplete example that illustrates the required popup interaction model. citeturn4search1turn4search5

There’s also a subtle WCAG-adjacent risk: suggestion lists that trigger navigation or context changes on input can violate expectations unless clearly controlled. Practical accessibility guidance notes that search suggestions often behave like comboboxes but must be implemented carefully to avoid unexpected context changes. citeturn4search17

A mobile-specific best practice is to ensure users have an explicit way to submit searches; Baymard’s mobile search research highlights significant friction when the submit affordance is unclear. citeturn4search0

### Analytics hooks

Even without a third-party engine, Saiko should log:
- Query submitted (`q`, entry page, auth state)
- Results returned (counts per section: maps_count, places_count)
- Result click (entity type, rank within section, target slug)
- No results (both sections empty)
- Create CTA from search (to quantify “search → creation” conversion)

If Saiko later adopts Algolia, these events map neatly onto the click/conversion/view event model used to unlock analytics and relevance improvements. citeturn4search3turn4search7

### Concise V1 recommendations

Implement now:
- Two-entity search (Maps + Places) with clear section separation (no interleaving).
- Deterministic ranking: exact → prefix → fuzzy similarity → tie-breakers (recency/popularity only as tie-breakers).
- Editorial boost only as a tie-breaker for Saiko-authored maps (never a hard override). citeturn6view0
- `/search` served as `noindex,follow`, crawlable so the crawler can see `noindex`. citeturn0search0turn9search1
- Strong SEO on `/map` and `/place` via structured data + canonical URLs + high-quality OG previews. citeturn4search2turn1search5turn1search3

Defer to V2:
- Autocomplete/typeahead (requires correct combobox accessibility patterns). citeturn4search1turn4search5
- Faceted filters (adds schema/field requirements + UI complexity; Airbnb’s scale shows how filters can proliferate and require redesign). citeturn2search30turn2search4
- Recommendations / related maps (needs behavioral signals; event tracking is the prerequisite). citeturn4search3turn4search7

### Migration path to V2

A low-risk migration path preserves URL and UX contracts while swapping the backend and adding capabilities:

1. **V1**: Postgres + `pg_trgm` (or simple SQL) with `/search?q=` and stable card/layout contract. citeturn0search2  
2. **V1.5**: Add popularity signals (views/shares) and use them only as tie-breakers; begin logging events consistently (foundation for future relevance). citeturn6view0turn4search3  
3. **V2**: Move to Typesense or Algolia when you need:
   - typeahead/autocomplete
   - facets/filters (neighborhood/category)
   - advanced relevance tuning
   - analytics-driven ranking iteration  
   Typesense’s design choices (in-memory indexes, facet/filter semantics) and Algolia’s ranking + event analytics model support these upgrades cleanly. citeturn5search39turn0search3turn6view0turn4search3