# Citebench Methodology v2

**Status:** LOCKED 2026-05-11. Empirically-grounded revision of v1. Research basis in `methodology-research.md`.

**Updated 2026-05-11 (same day):** Added per-page-type rubrics — see "Page-type-aware scoring" section. The article rubric below is unchanged; non-article page types use a subset of rules and different dimension weights.

**Living document.** AEO landscape shifts month-to-month — Google AIO algorithm updates, ChatGPT crawler changes, Perplexity-Reddit dynamics, new schema types Google starts citing, etc. Revisit weights quarterly (next: 2026-08) and after any major engine update. Score interpretation is "best current understanding," not "ground truth."

## Page-type-aware scoring

Citebench detects page type and applies type-specific rubrics. A marketing homepage and a 3,000-word article shouldn't be scored identically.

**Detected types:**
- **`article`** — long-form editorial. Full v2 rubric applies.
- **`homepage`** — marketing homepage at root URL. Weights skewed to Source & Authority (40%) and Structural (25%); rules like "author byline" and "answer capsules under H2" are filtered out (N/A).
- **`landing`** — product or campaign landing page. Similar to homepage but with slight weight differences.
- **`machine-version`** — page serves AI-targeted markdown content to non-browser user agents. Awarded a positive signal (+5pt to Authority) for serving AI-friendly content; structural and answer-fit rules are mostly N/A because there's no HTML structure to evaluate.
- **`other`** — unclassified. Defaults to article weights but some rules skipped.

**Per-type dimension weights:**

| Dimension | Article | Homepage | Landing | Machine-version | Other |
|---|---|---|---|---|---|
| Source & Authority | 25% | 40% | 35% | 30% | 25% |
| Factual Density | 25% | 15% | 20% | 35% | 25% |
| Answer Engine Fit | 20% | 10% | 10% | 5% | 20% |
| Structural Citability | 20% | 25% | 25% | 5% | 20% |
| Technical Cleanliness | 10% | 10% | 10% | 25% | 10% |

**Detection signals (in order):**
1. Heavy markdown signature + no HTML semantics → `machine-version`
2. Schema.org `Article`/`BlogPosting`/`NewsArticle` → `article`
3. URL contains `/blog/`, `/articles/`, `/news/`, or date pattern (`/YYYY/MM/DD/`) → `article`
4. Root URL (`/`) → `homepage`
5. H1 + 3+ H2s + 5+ paragraphs → `article` (catches blog posts without schema)
6. Schema.org `Product`/`Service`/`Offer` → `landing`
7. Default → `landing` or `other`

**Rules that filter out for non-article types:**
- `auth.byline` — only `article` (homepages don't have authors)
- `auth.publish-date` — only `article` (homepages don't have publish dates)
- `auth.outbound-citations` — `article` + `machine-version` + `other` (marketing pages rarely cite externally)
- `fit.answer-capsules` — only `article` (homepages don't have H2-per-section structure)
- `struct.paragraph-length` — `article` + `other`
- And so on — see `RULE_APPLICABILITY` in `citebench/lib/types.ts`.

Non-applicable rules are shown in the UI marked "N/A for this page type" so users understand why they're skipped, rather than being hidden silently.

## What changed from v1 (and why)

| Dimension | v1 | v2 | Reason |
|---|---|---|---|
| Source & Authority | 20% | **25%** | E-E-A-T r=0.81 in Wellows; 96% of AIO citations from E-E-A-T-strong sources; on-page proxies (byline, sameAs, Organization schema) are the strongest individually-measurable signal we can score from one URL |
| Factual Density | 20% | **25%** | Strongest content-level lever. Original data → +30–40% citation; statistics → +41%; answer capsule + proprietary insight → 34.3% citation rate |
| Answer Engine Fit | 20% | **20%** | Hold, but redefined around *semantic completeness* (r=0.87) and *answer capsules* (65% more citations), not just FAQ schema |
| Structural Citability | 25% | **20%** | Schema markup is high-leverage (+73%, 2.3x lift), but heading/paragraph hygiene alone is table stakes |
| Technical Cleanliness | 15% | **10%** | robots.txt blocking does NOT depress citation (88–92% of blocking sites still cited per BuzzStream's 4M-citation study). CWV is a gate, not a driver |

## Core principle (unchanged)

**Deterministic + explainable.** No LLM at audit time. Every score line has a clear "here's exactly why." Transparency is the positioning wedge.

## v2 rubric: 100pt across 5 dimensions

### 1. Source & Authority — 25 pt

- Author byline + Person schema + credentials/sameAs (LinkedIn/ORCID/Wikidata) — **8 pt**
- Outbound citations to authoritative domains (.edu, .gov, named sources) — **6 pt**
- Organization schema with sameAs chain (Wikipedia, Wikidata, social) — **5 pt**
- Visible publish/update date (`datePublished`, `dateModified`) — **3 pt**
- Wikipedia/Wikidata entity match for primary subject — **3 pt**

### 2. Factual Density — 25 pt

- Original research / proprietary statistic presence — **8 pt** *(hardest to detect; use heuristics for "in our study," "we surveyed N," named methodology references)*
- Quantitative claim density (numbers/percentages/dates per 1,000 words) — **7 pt**
- Named-entity density (NER-detected people, orgs, places) — **5 pt**
- Penalty: AI-fluff phrase density (see `fluff-wordlist-seed.md`) — **up to −8 pt**
- **Fatal**: AI self-identifier phrases ("as an AI language model," "as of my last training") — **automatic disqualification**

### 3. Answer Engine Fit — 20 pt

- Semantic completeness — answer capsule under each H2 (40–160 word self-contained declarative blocks opening with the answer) — **10 pt** *(largest single sub-component in the rubric)*
- TL;DR / summary block in top 200–300 words — **4 pt**
- FAQ section + FAQPage schema — **3 pt**
- Lists/tables for enumerable content — **3 pt**

### 4. Structural Citability — 20 pt

- Schema stack present (Article + FAQPage + BreadcrumbList + Organization + Person + topic-specific) — **8 pt**
- Clean H1/H2/H3 hierarchy (one H1, no level jumps) — **4 pt**
- Paragraph length appropriate (avg 40–80 words, no wall-of-text) — **3 pt**
- Descriptive title tag with primary question/topic — **3 pt**
- Internal linking with descriptive anchors (3+ contextual internal links) — **2 pt**

### 5. Technical Cleanliness — 10 pt

- HTTPS — **gate** (fatal if missing)
- Renders core content without JS — **3 pt**
- robots.txt does NOT block ChatGPT-User / Claude-User / Perplexity-User (live retrieval) — **3 pt** *(−5pt if blocked, NOT fatal)*
- robots.txt does NOT block GPTBot / Google-Extended / ClaudeBot / CCBot (training) — **2 pt** *(−2 to −3pt if blocked, NOT fatal)*
- TTFB <1s + LCP <2.5s + no crawl-time errors — **2 pt**

## Output the user sees (sample)

```
CITEBENCH SCORE: 73 / 100

✅ Source & Authority: 20 / 25
   • Author byline + sameAs: 8/8
   • Outbound .edu/.gov citations: 4/6
   • Org schema + sameAs: 5/5
   • Visible date: 3/3
   • Wikipedia/Wikidata entity match: 0/3 ← missing

⚠️  Factual Density: 14 / 25
   • Original data: 0/8 ← missing
   • Quantitative claim density: 5/7
   • Named-entity density: 5/5
   • AI-fluff penalty: −4 pt (detected: "delve into," "in today's fast-paced," "leverage")
   • Self-identifier: clean

✅ Answer Engine Fit: 15 / 20
   • Answer capsules: 7/10 (3 of 5 H2 sections have capsule structure)
   • TL;DR present: 4/4
   • FAQ + schema: 0/3
   • Lists/tables: 4/3

✅ Structural Citability: 16 / 20
✅ Technical: 8 / 10

Top 3 fixes (sorted by score lift):
1. Add original data or proprietary statistics in the first 600 words (+8 pt est)
2. Add FAQ section with FAQPage schema (+3 pt) + complete answer capsules in remaining H2s (+3 pt)
3. Add Wikipedia/Wikidata sameAs to Organization schema (+3 pt)
```

## What Citebench cannot score (honest scope statement)

A URL-level audit cannot measure the strongest predictors of AI citation, which are off-page:

- **Off-page brand mentions** across the web (Ahrefs: r=0.66–0.74 with AI visibility)
- **YouTube mentions** (r=0.737 — strongest single signal Ahrefs found)
- **Reddit presence** (46.7% of Perplexity citations are Reddit)
- **Cross-platform brand consistency**

This is a known scope gap. Future versions could add brand-level scoring via search APIs; v2 stays URL-focused and is honest about it.

## Platform divergence (informational)

The v2 score is an *average expected citability* across major engines. But:

- **ChatGPT** favors Wikipedia (47.9% of top-10), encyclopedic editorial
- **Perplexity** favors Reddit (46.7%), freshness, per-claim attribution
- **Google AIO** favors UGC + YouTube + multi-modal content, freshness
- **Gemini** favors .gov/.edu/institutional (26%)
- Only **11% of domains** are cited by both ChatGPT and Perplexity

A perfectly Citebench-optimized URL likely won't be cited equally everywhere. The score targets the on-page features that *can* matter across all four. Future improvement: per-platform sub-scores.

## Confidence and caveats

- Ahrefs' 75k-brand study and BuzzStream's 4M-citation analysis are the most defensible empirical anchors.
- Wellows' r=0.92 for multi-modal is implausibly high — treat individual r-values as directional, not literal.
- Most "studies" are vendor research without disclosed methodology. v2 weights are evidence-informed best guesses, not regression-derived coefficients.
- All claims sourced in `methodology-research.md`.

## Implementation notes (carry into build phase)

All rules executable with:
- HTTP fetch + Cheerio HTML parsing
- DOM traversal for structure + paragraph stats
- JSON-LD schema parsing
- Wordlist matching for fluff bigrams (see `fluff-wordlist-seed.md`)
- robots.txt fetch + parse for crawler block check
- Open-source NER (spaCy/transformers.js) for entity density — runs in browser/Edge or via Vercel function
- External lookups for Wikipedia/Wikidata entity match (Wikipedia API, free, rate-limited)

Audit completes in <5 sec per URL. Free to run.
