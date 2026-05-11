import { PageContext, RuleResult } from "../types";
import { Doc, getMainText, countWords } from "../parse";
import {
  SINGLE_WORD_TELLS,
  AI_OUTPUT_PHRASES,
  HEDGING_PHRASES,
  MARKETING_FLUFF,
  SEO_CLICHES,
  SELF_IDENTIFIER_FATAL,
} from "../fluff-wordlist";

const ORIGINAL_DATA_SIGNALS = [
  /in our (?:study|survey|analysis|research)/i,
  /our (?:study|survey|analysis|research) (?:of|found|shows)/i,
  /we (?:surveyed|analyzed|studied|interviewed|measured) (\d|some|a sample of)/i,
  /according to our (?:data|analysis|research|study|survey)/i,
  /citebench (?:study|analysis|survey|data)/i,
  /(?:we|the team) (?:built|developed|created) (?:a|an) (?:dataset|index|benchmark)/i,
  /proprietary (?:data|dataset|study|research|index)/i,
];

export function runFactualRules(_ctx: PageContext, $: Doc): RuleResult[] {
  const text = getMainText($);
  const wordCount = countWords(text);
  return [
    originalDataCheck(text, wordCount),
    quantitativeDensityCheck(text, wordCount),
    namedEntityDensityCheck(text, wordCount),
    aiFluffPenalty(text, wordCount),
    selfIdentifierCheck(text),
  ];
}

function originalDataCheck(text: string, wordCount: number): RuleResult {
  const matches = ORIGINAL_DATA_SIGNALS.filter((re) => re.test(text));
  let earned: number;
  if (matches.length >= 2) earned = 8;
  else if (matches.length === 1) earned = 5;
  else earned = 0;
  return {
    ruleId: "fact.original-data",
    dimension: "factual",
    label: "Original research / proprietary data",
    maxPoints: 8,
    earnedPoints: earned,
    passed: matches.length >= 1,
    message:
      matches.length === 0
        ? "No signals of original research detected (e.g., 'in our study', 'we surveyed N')"
        : `Original-data signals: ${matches.length} pattern match${matches.length === 1 ? "" : "es"}`,
    details: { wordCount, matchCount: matches.length },
  };
}

function quantitativeDensityCheck(text: string, wordCount: number): RuleResult {
  if (wordCount === 0) {
    return {
      ruleId: "fact.quantitative",
      dimension: "factual",
      label: "Quantitative claim density",
      maxPoints: 7,
      earnedPoints: 0,
      passed: false,
      message: "No text content",
    };
  }
  const numberMatches = text.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
  const dollarMatches = text.match(/\$\d/g) ?? [];
  const yearMatches = text.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  const total = numberMatches.length + dollarMatches.length + yearMatches.length;
  const per1k = (total / wordCount) * 1000;

  let earned: number;
  if (per1k >= 15) earned = 7;
  else if (per1k >= 8) earned = 5;
  else if (per1k >= 4) earned = 3;
  else if (per1k >= 1) earned = 1;
  else earned = 0;

  return {
    ruleId: "fact.quantitative",
    dimension: "factual",
    label: "Quantitative claim density",
    maxPoints: 7,
    earnedPoints: earned,
    passed: per1k >= 4,
    message: `${total} numeric/date claims across ${wordCount} words (${per1k.toFixed(1)}/1k words)`,
    details: { total, wordCount, per1k },
  };
}

function namedEntityDensityCheck(text: string, wordCount: number): RuleResult {
  if (wordCount === 0) {
    return {
      ruleId: "fact.named-entities",
      dimension: "factual",
      label: "Named-entity density",
      maxPoints: 5,
      earnedPoints: 0,
      passed: false,
      message: "No text content",
    };
  }
  const candidates = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g) ?? [];
  const sentenceStarts = new Set(
    (text.match(/(?:^|[.!?]\s+)([A-Z][a-z]+)/g) ?? []).map((s) => s.replace(/^[.!?\s]+/, "")),
  );
  const filtered = candidates.filter((c) => !sentenceStarts.has(c.split(/\s+/)[0]));
  const unique = new Set(filtered);
  const per1k = (unique.size / wordCount) * 1000;

  let earned: number;
  if (per1k >= 30) earned = 5;
  else if (per1k >= 18) earned = 4;
  else if (per1k >= 10) earned = 2;
  else if (per1k >= 4) earned = 1;
  else earned = 0;

  return {
    ruleId: "fact.named-entities",
    dimension: "factual",
    label: "Named-entity density",
    maxPoints: 5,
    earnedPoints: earned,
    passed: per1k >= 10,
    message: `${unique.size} likely named entities (${per1k.toFixed(1)}/1k words) — heuristic, not full NER`,
    details: { count: unique.size, wordCount, per1k },
  };
}

function aiFluffPenalty(text: string, wordCount: number): RuleResult {
  const lower = text.toLowerCase();

  const allPhrases = [...AI_OUTPUT_PHRASES, ...HEDGING_PHRASES, ...MARKETING_FLUFF, ...SEO_CLICHES];
  const hits: { phrase: string; count: number }[] = [];
  for (const phrase of allPhrases) {
    const count = countOccurrences(lower, phrase);
    if (count > 0) hits.push({ phrase, count });
  }

  const singleWordOveruse: { word: string; count: number }[] = [];
  if (wordCount >= 100) {
    for (const word of SINGLE_WORD_TELLS) {
      const count = countWordOccurrences(lower, word);
      const ratePer1k = (count / wordCount) * 1000;
      if (ratePer1k >= 2) singleWordOveruse.push({ word, count });
    }
  }

  const totalHits = hits.reduce((a, b) => a + b.count, 0) + singleWordOveruse.length;
  const penalty = Math.min(8, totalHits);

  return {
    ruleId: "fact.ai-fluff",
    dimension: "factual",
    label: "AI-fluff phrase penalty",
    maxPoints: 0,
    earnedPoints: -penalty,
    passed: penalty === 0,
    message:
      penalty === 0
        ? "No AI-fluff phrases or overused word tells detected"
        : `−${penalty}pt: ${hits.length} fluff phrase${hits.length === 1 ? "" : "s"}${singleWordOveruse.length ? `, ${singleWordOveruse.length} overused word tells` : ""}`,
    details: {
      phrases: hits.slice(0, 10),
      overusedWords: singleWordOveruse.slice(0, 10),
    },
  };
}

function selfIdentifierCheck(text: string): RuleResult {
  const lower = text.toLowerCase();
  const hits = SELF_IDENTIFIER_FATAL.filter((p) => lower.includes(p));
  const passed = hits.length === 0;
  return {
    ruleId: "fact.self-identifier",
    dimension: "factual",
    label: "No AI self-identifier bleed-through",
    maxPoints: 0,
    earnedPoints: 0,
    passed,
    message: passed
      ? "Clean — no AI self-identifier strings"
      : `FATAL: AI self-identifier strings detected: ${hits.join("; ")}`,
    details: { hits, fatal: !passed },
  };
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

function countWordOccurrences(haystack: string, word: string): number {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "gi");
  return (haystack.match(re) ?? []).length;
}
