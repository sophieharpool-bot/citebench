import {
  AuditResult,
  Dimension,
  DimensionScore,
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS_BY_TYPE,
  Fix,
  RULE_APPLICABILITY,
  RuleResult,
} from "./types";
import { fetchPage } from "./fetch";
import { parse } from "./parse";
import {
  detectPageType,
  PageType,
  PAGE_TYPE_DESCRIPTIONS,
  PAGE_TYPE_LABELS,
} from "./page-type";
import { runTechnicalRules } from "./rules/technical";
import { runStructuralRules } from "./rules/structural";
import { runAuthorityRules } from "./rules/authority";
import { runFactualRules } from "./rules/factual";
import { runAnswerFitRules } from "./rules/answer-fit";

export async function audit(url: string): Promise<AuditResult> {
  const ctx = await fetchPage(url);
  const $ = parse(ctx.html);

  const pageType = detectPageType(ctx.finalUrl, $);

  const rawResults: RuleResult[] = [
    ...runAuthorityRules(ctx, $),
    ...runFactualRules(ctx, $),
    ...runAnswerFitRules(ctx, $),
    ...runStructuralRules(ctx, $),
    ...runTechnicalRules(ctx, $),
  ];

  const allResults = rawResults.map((r) => ({
    ...r,
    applicable: isApplicable(r.ruleId, pageType),
  }));

  if (pageType === "machine-version") {
    allResults.push({
      ruleId: "auth.machine-version-bonus",
      dimension: "authority",
      label: "AI-targeted content served",
      maxPoints: 5,
      earnedPoints: 5,
      passed: true,
      applicable: true,
      message:
        "Site serves dedicated AI-friendly markdown content to non-browser user agents — strong AEO posture",
    });
  }

  const httpsRule = allResults.find((r) => r.ruleId === "tech.https");
  const selfIdRule = allResults.find((r) => r.ruleId === "fact.self-identifier");

  let disqualified = false;
  let disqualificationReason: string | undefined;
  if (httpsRule && !httpsRule.passed) {
    disqualified = true;
    disqualificationReason = "Page is not served over HTTPS";
  } else if (selfIdRule && !selfIdRule.passed) {
    disqualified = true;
    disqualificationReason = "AI self-identifier strings detected — page contains raw LLM output";
  }

  const dimensions = buildDimensionScores(allResults, pageType);
  const score = disqualified ? 0 : computeOverallScore(dimensions);
  const topFixes = disqualified ? [] : computeTopFixes(allResults);

  return {
    url,
    finalUrl: ctx.finalUrl,
    fetchedAt: new Date().toISOString(),
    fetchTimeMs: ctx.fetchTimeMs,
    pageType,
    pageTypeLabel: PAGE_TYPE_LABELS[pageType],
    pageTypeDescription: PAGE_TYPE_DESCRIPTIONS[pageType],
    score,
    disqualified,
    disqualificationReason,
    dimensions,
    topFixes,
  };
}

function isApplicable(ruleId: string, pageType: PageType): boolean {
  const allowedTypes = RULE_APPLICABILITY[ruleId];
  if (!allowedTypes) return true;
  return allowedTypes.includes(pageType);
}

function buildDimensionScores(results: RuleResult[], pageType: PageType): DimensionScore[] {
  const byDim = new Map<Dimension, RuleResult[]>();
  for (const r of results) {
    const list = byDim.get(r.dimension) ?? [];
    list.push(r);
    byDim.set(r.dimension, list);
  }

  const dims: Dimension[] = ["authority", "factual", "answer-fit", "structural", "technical"];
  const weights = DIMENSION_WEIGHTS_BY_TYPE[pageType];
  return dims.map((d) => {
    const rs = byDim.get(d) ?? [];
    const applicableRs = rs.filter((r) => r.applicable !== false);
    const maxPoints = applicableRs.reduce((a, b) => a + b.maxPoints, 0);
    const earned = clamp(
      applicableRs.reduce((a, b) => a + b.earnedPoints, 0),
      0,
      maxPoints,
    );
    return {
      dimension: d,
      label: DIMENSION_LABELS[d],
      weight: weights[d],
      maxPoints,
      earnedPoints: earned,
      results: rs,
    };
  });
}

function computeOverallScore(dimensions: DimensionScore[]): number {
  let total = 0;
  let totalWeight = 0;
  for (const d of dimensions) {
    if (d.maxPoints === 0) continue;
    const dimensionPercent = d.earnedPoints / d.maxPoints;
    total += dimensionPercent * d.weight;
    totalWeight += d.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round((total / totalWeight) * 100);
}

function computeTopFixes(results: RuleResult[]): Fix[] {
  return results
    .filter((r) => r.applicable !== false && r.maxPoints > 0 && r.earnedPoints < r.maxPoints)
    .map((r) => ({
      ruleId: r.ruleId,
      description: fixDescription(r),
      estimatedPointLift: r.maxPoints - Math.max(0, r.earnedPoints),
    }))
    .sort((a, b) => b.estimatedPointLift - a.estimatedPointLift)
    .slice(0, 3);
}

function fixDescription(r: RuleResult): string {
  return `${r.label} — ${r.message}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
