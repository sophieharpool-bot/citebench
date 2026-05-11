import { PageContext, RuleResult } from "../types";
import { Doc, hasSchemaType, countWords } from "../parse";

export function runAnswerFitRules(_ctx: PageContext, $: Doc): RuleResult[] {
  return [
    answerCapsuleCheck($),
    tldrCheck($),
    faqCheck($),
    listsTablesCheck($),
  ];
}

function answerCapsuleCheck($: Doc): RuleResult {
  const h2s = $("h2").toArray();
  if (h2s.length === 0) {
    return {
      ruleId: "fit.answer-capsules",
      dimension: "answer-fit",
      label: "Semantic answer capsules under each H2",
      maxPoints: 10,
      earnedPoints: 0,
      passed: false,
      message: "No H2 headings found — page has no answer-capsule structure",
    };
  }

  let capsuleCount = 0;
  for (const h2 of h2s) {
    const nextEl = $(h2).next();
    if (nextEl.length === 0) continue;
    if (nextEl[0].tagName !== "p") continue;
    const text = nextEl.text().trim();
    const words = countWords(text);
    if (words >= 40 && words <= 160 && /[.!?]/.test(text)) {
      capsuleCount++;
    }
  }

  const ratio = capsuleCount / h2s.length;
  const earned = Math.round(10 * ratio);

  return {
    ruleId: "fit.answer-capsules",
    dimension: "answer-fit",
    label: "Semantic answer capsules under each H2",
    maxPoints: 10,
    earnedPoints: earned,
    passed: ratio >= 0.5,
    message: `${capsuleCount} of ${h2s.length} H2 sections have a 40–160 word self-contained answer paragraph`,
    details: { capsuleCount, h2Count: h2s.length, ratio },
  };
}

function tldrCheck($: Doc): RuleResult {
  const firstSection = $("p")
    .slice(0, 5)
    .map((_, el) => $(el).text())
    .get()
    .join(" ")
    .toLowerCase();

  const tldrPatterns = [
    /\btl;dr\b/i,
    /\btldr\b/i,
    /\bin (?:short|brief|summary)\b/i,
    /^summary:/im,
    /\bkey takeaways?\b/i,
    /\bbottom line\b/i,
  ];
  const matched = tldrPatterns.some((p) => p.test(firstSection));

  if (matched) {
    return {
      ruleId: "fit.tldr",
      dimension: "answer-fit",
      label: "TL;DR / summary near top",
      maxPoints: 4,
      earnedPoints: 4,
      passed: true,
      message: "Summary block detected in the first 5 paragraphs",
    };
  }

  const firstParaText = $("p").first().text().trim();
  const firstWords = countWords(firstParaText);
  if (firstWords >= 40 && firstWords <= 120 && /[.!?]/.test(firstParaText)) {
    return {
      ruleId: "fit.tldr",
      dimension: "answer-fit",
      label: "TL;DR / summary near top",
      maxPoints: 4,
      earnedPoints: 2,
      passed: false,
      message: `First paragraph reads like a partial summary (${firstWords} words) but no explicit TL;DR/summary marker`,
    };
  }

  return {
    ruleId: "fit.tldr",
    dimension: "answer-fit",
    label: "TL;DR / summary near top",
    maxPoints: 4,
    earnedPoints: 0,
    passed: false,
    message: "No TL;DR / summary / key takeaways block detected near the top",
  };
}

function faqCheck($: Doc): RuleResult {
  const hasFaqSchema = hasSchemaType($, "FAQPage");
  const headingHasFaq =
    $("h1, h2, h3").filter((_, el) => /\b(faq|frequently asked|q\s*&\s*a)\b/i.test($(el).text())).length > 0;

  let earned = 0;
  const signals: string[] = [];
  if (hasFaqSchema) {
    earned += 3;
    signals.push("FAQPage schema");
  } else if (headingHasFaq) {
    earned += 1;
    signals.push("FAQ heading without schema");
  }

  return {
    ruleId: "fit.faq",
    dimension: "answer-fit",
    label: "FAQ section with FAQPage schema",
    maxPoints: 3,
    earnedPoints: Math.min(3, earned),
    passed: hasFaqSchema,
    message: signals.length ? signals.join(", ") : "No FAQ section or FAQPage schema detected",
    details: { hasFaqSchema, headingHasFaq },
  };
}

function listsTablesCheck($: Doc): RuleResult {
  const listCount = $("ul, ol").length;
  const tableCount = $("table").length;
  const total = listCount + tableCount;
  let earned: number;
  if (total >= 3) earned = 3;
  else if (total >= 1) earned = 2;
  else earned = 0;
  return {
    ruleId: "fit.lists-tables",
    dimension: "answer-fit",
    label: "Lists and tables for enumerable content",
    maxPoints: 3,
    earnedPoints: earned,
    passed: total >= 1,
    message: `${listCount} list${listCount === 1 ? "" : "s"}, ${tableCount} table${tableCount === 1 ? "" : "s"}`,
    details: { listCount, tableCount },
  };
}
