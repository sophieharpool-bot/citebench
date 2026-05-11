import {
  AuditResult,
  Dimension,
  DimensionScore,
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
  Fix,
  RuleResult,
} from "./types";
import { fetchPage } from "./fetch";
import { parse } from "./parse";
import { runTechnicalRules } from "./rules/technical";
import { runStructuralRules } from "./rules/structural";
import { runAuthorityRules } from "./rules/authority";
import { runFactualRules } from "./rules/factual";
import { runAnswerFitRules } from "./rules/answer-fit";

export async function audit(url: string): Promise<AuditResult> {
  const ctx = await fetchPage(url);
  const $ = parse(ctx.html);

  const allResults: RuleResult[] = [
    ...runAuthorityRules(ctx, $),
    ...runFactualRules(ctx, $),
    ...runAnswerFitRules(ctx, $),
    ...runStructuralRules(ctx, $),
    ...runTechnicalRules(ctx, $),
  ];

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

  const dimensions = buildDimensionScores(allResults);
  const score = disqualified ? 0 : computeOverallScore(dimensions);
  const topFixes = disqualified ? [] : computeTopFixes(allResults);

  return {
    url,
    finalUrl: ctx.finalUrl,
    fetchedAt: new Date().toISOString(),
    fetchTimeMs: ctx.fetchTimeMs,
    score,
    disqualified,
    disqualificationReason,
    dimensions,
    topFixes,
  };
}

function buildDimensionScores(results: RuleResult[]): DimensionScore[] {
  const byDim = new Map<Dimension, RuleResult[]>();
  for (const r of results) {
    const list = byDim.get(r.dimension) ?? [];
    list.push(r);
    byDim.set(r.dimension, list);
  }

  const dims: Dimension[] = ["authority", "factual", "answer-fit", "structural", "technical"];
  return dims.map((d) => {
    const rs = byDim.get(d) ?? [];
    const maxPoints = rs.reduce((a, b) => a + b.maxPoints, 0);
    const earned = clamp(
      rs.reduce((a, b) => a + b.earnedPoints, 0),
      0,
      maxPoints,
    );
    return {
      dimension: d,
      label: DIMENSION_LABELS[d],
      weight: DIMENSION_WEIGHTS[d],
      maxPoints,
      earnedPoints: earned,
      results: rs,
    };
  });
}

function computeOverallScore(dimensions: DimensionScore[]): number {
  let total = 0;
  for (const d of dimensions) {
    if (d.maxPoints === 0) continue;
    const dimensionPercent = d.earnedPoints / d.maxPoints;
    total += dimensionPercent * d.weight;
  }
  return Math.round(total);
}

function computeTopFixes(results: RuleResult[]): Fix[] {
  const fixes = results
    .filter((r) => r.maxPoints > 0 && r.earnedPoints < r.maxPoints)
    .map((r) => ({
      ruleId: r.ruleId,
      description: fixDescription(r),
      estimatedPointLift: r.maxPoints - Math.max(0, r.earnedPoints),
    }))
    .sort((a, b) => b.estimatedPointLift - a.estimatedPointLift)
    .slice(0, 3);
  return fixes;
}

function fixDescription(r: RuleResult): string {
  return `${r.label} — ${r.message}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
