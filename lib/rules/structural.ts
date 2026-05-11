import { PageContext, RuleResult } from "../types";
import { Doc, hasSchemaType, countWords } from "../parse";

const SCHEMA_STACK_TYPES = [
  "Article",
  "BlogPosting",
  "NewsArticle",
  "FAQPage",
  "BreadcrumbList",
  "Organization",
  "Person",
  "HowTo",
  "Product",
  "Review",
  "DefinedTerm",
];

export function runStructuralRules(_ctx: PageContext, $: Doc): RuleResult[] {
  return [
    schemaStackCheck($),
    headingHierarchyCheck($),
    paragraphLengthCheck($),
    titleTagCheck($),
    internalLinkingCheck($),
  ];
}

function schemaStackCheck($: Doc): RuleResult {
  const present = SCHEMA_STACK_TYPES.filter((t) => hasSchemaType($, t));
  const count = present.length;
  let earned: number;
  if (count >= 4) earned = 8;
  else if (count === 3) earned = 6;
  else if (count === 2) earned = 4;
  else if (count === 1) earned = 2;
  else earned = 0;
  return {
    ruleId: "struct.schema-stack",
    dimension: "structural",
    label: "Schema markup stack present",
    maxPoints: 8,
    earnedPoints: earned,
    passed: count >= 2,
    message:
      count === 0
        ? "No JSON-LD schema markup found"
        : `${count} schema type${count === 1 ? "" : "s"} found: ${present.join(", ")}`,
    details: { present },
  };
}

function headingHierarchyCheck($: Doc): RuleResult {
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;

  let jumpIssue = false;
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  let lastLevel = 0;
  for (const el of headings) {
    const level = parseInt(el.tagName.substring(1), 10);
    if (lastLevel > 0 && level > lastLevel + 1) {
      jumpIssue = true;
      break;
    }
    lastLevel = level;
  }

  const h1Ok = h1Count === 1;
  const noJumps = !jumpIssue;
  const hasStructure = h2Count >= 2 || h3Count >= 2;

  let earned = 0;
  const issues: string[] = [];
  if (h1Ok) earned += 1.5;
  else issues.push(h1Count === 0 ? "no H1" : `${h1Count} H1s`);
  if (noJumps) earned += 1.5;
  else issues.push("heading-level jumps");
  if (hasStructure) earned += 1;
  else issues.push("not enough H2/H3 structure");

  return {
    ruleId: "struct.heading-hierarchy",
    dimension: "structural",
    label: "Heading hierarchy clean",
    maxPoints: 4,
    earnedPoints: Math.round(earned),
    passed: h1Ok && noJumps && hasStructure,
    message: issues.length === 0
      ? `Clean hierarchy (1 H1, ${h2Count} H2, ${h3Count} H3)`
      : `Issues: ${issues.join(", ")}`,
    details: { h1Count, h2Count, h3Count, jumpIssue },
  };
}

function paragraphLengthCheck($: Doc): RuleResult {
  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((p) => p.length > 0);

  if (paragraphs.length < 3) {
    return {
      ruleId: "struct.paragraph-length",
      dimension: "structural",
      label: "Paragraph length appropriate",
      maxPoints: 3,
      earnedPoints: 0,
      passed: false,
      message: `Only ${paragraphs.length} paragraphs found — page may be thin`,
      details: { count: paragraphs.length },
    };
  }

  const wordCounts = paragraphs.map((p) => countWords(p));
  const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const inRange = avg >= 30 && avg <= 100;

  return {
    ruleId: "struct.paragraph-length",
    dimension: "structural",
    label: "Paragraph length appropriate",
    maxPoints: 3,
    earnedPoints: inRange ? 3 : avg > 0 && avg < 200 ? 1 : 0,
    passed: inRange,
    message: inRange
      ? `Avg paragraph ${Math.round(avg)} words — citation-friendly`
      : avg > 100
      ? `Avg paragraph ${Math.round(avg)} words — walls of text are hard for LLMs to extract`
      : `Avg paragraph ${Math.round(avg)} words — thin fragments`,
    details: { avgWords: Math.round(avg), paragraphCount: paragraphs.length },
  };
}

function titleTagCheck($: Doc): RuleResult {
  const title = $("title").text().trim();
  const len = title.length;
  const inRange = len >= 30 && len <= 65;
  return {
    ruleId: "struct.title-tag",
    dimension: "structural",
    label: "Descriptive title tag",
    maxPoints: 3,
    earnedPoints: inRange ? 3 : len > 0 ? 1 : 0,
    passed: inRange,
    message: !title
      ? "No <title> tag found"
      : inRange
      ? `Title: "${title}" (${len} chars)`
      : `Title length ${len} chars — sweet spot is 30–65`,
    details: { title, length: len },
  };
}

function internalLinkingCheck($: Doc): RuleResult {
  const pageHost = (() => {
    const link = $('link[rel="canonical"]').attr("href");
    if (link) {
      try {
        return new URL(link).host;
      } catch {
        // fall through
      }
    }
    return null;
  })();

  const internalLinks: { href: string; anchor: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const anchor = $(el).text().trim();
    if (!href || !anchor) return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const u = new URL(href, pageHost ? `https://${pageHost}/` : "https://example.com/");
      const isInternal = !pageHost || u.host === pageHost;
      if (isInternal) internalLinks.push({ href, anchor });
    } catch {
      // skip invalid hrefs
    }
  });

  const descriptiveCount = internalLinks.filter(
    (l) => l.anchor.split(/\s+/).length >= 2 && !/^(click here|here|read more|learn more)$/i.test(l.anchor),
  ).length;

  const passed = descriptiveCount >= 3;
  return {
    ruleId: "struct.internal-links",
    dimension: "structural",
    label: "Internal linking with descriptive anchors",
    maxPoints: 2,
    earnedPoints: passed ? 2 : descriptiveCount >= 1 ? 1 : 0,
    passed,
    message: passed
      ? `${descriptiveCount} descriptive internal links`
      : `Only ${descriptiveCount} descriptive internal links (target: 3+)`,
    details: { totalInternal: internalLinks.length, descriptiveCount },
  };
}
