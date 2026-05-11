# Citebench

Deterministic AEO audit tool. Scores any URL 0–100 on how citable it is by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude).

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript (strict)
- Cheerio for HTML parsing
- robots-parser for robots.txt
- No LLM at audit time — every rule is deterministic + explainable

## Run locally

```bash
cd projects/aeo-audit-tool/citebench
npm install
npm run dev
```

Open http://localhost:3000.

## Layout

```
app/
  layout.tsx         root layout
  page.tsx           paste-URL form + results
  globals.css        styles
  api/audit/route.ts POST { url } → AuditResult
lib/
  types.ts           shared types + dimension weights
  fetch.ts           HTTP fetch (15s timeout) + robots.txt
  parse.ts           cheerio wrapper + JSON-LD helpers
  fluff-wordlist.ts  AI/fluff phrase seed list
  scoring.ts         dispatch + score aggregation + top-fixes
  rules/
    authority.ts     byline, citations, schema, dates, sameAs
    factual.ts       original data, numbers, entities, AI-fluff penalty
    answer-fit.ts    answer capsules, TL;DR, FAQ, lists/tables
    structural.ts    schema stack, headings, paragraphs, title, internal links
    technical.ts     HTTPS, JS-render, robots.txt, fetch speed
```

## Methodology

See sibling `../methodology-v2.md`. Locked 2026-05-11. Revisit quarterly.

## Status

**MVP scaffold complete.** Single-URL audit pipeline runs end-to-end:
HTTP fetch → Cheerio parse → 24 deterministic rules across 5 dimensions → scored breakdown + top 3 fixes.

**Known gaps (in priority order):**

- **Real NER** for entity density (currently a capitalized-word heuristic). Plan: `compromise` or `wink-nlp`, runs in serverless function.
- **Wikipedia/Wikidata entity match** for primary subject (currently only checks `sameAs` links in schema). Plan: Wikipedia API lookup by canonical title.
- **Original-data detection** is regex-only. False negatives expected for prose-style original data. Plan: expand patterns + add LLM-judge mode for paid tier.
- **No tests yet.** Each rule module should get a fixture-based test set.
- **No share-card / OG image** for "I scored 73 on Citebench" social sharing.
- **No paid tier / auth.** Free tool only.

## Deployment

Will deploy to Vercel free tier. Domain: citebench.com (Cloudflare DNS).
