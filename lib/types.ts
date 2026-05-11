export type Dimension =
  | "authority"
  | "factual"
  | "answer-fit"
  | "structural"
  | "technical";

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  authority: 25,
  factual: 25,
  "answer-fit": 20,
  structural: 20,
  technical: 10,
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  authority: "Source & Authority",
  factual: "Factual Density",
  "answer-fit": "Answer Engine Fit",
  structural: "Structural Citability",
  technical: "Technical Cleanliness",
};

export interface RuleResult {
  ruleId: string;
  dimension: Dimension;
  label: string;
  maxPoints: number;
  earnedPoints: number;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface DimensionScore {
  dimension: Dimension;
  label: string;
  weight: number;
  maxPoints: number;
  earnedPoints: number;
  results: RuleResult[];
}

export interface Fix {
  ruleId: string;
  description: string;
  estimatedPointLift: number;
}

export interface AuditResult {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  fetchTimeMs: number;
  score: number;
  disqualified: boolean;
  disqualificationReason?: string;
  dimensions: DimensionScore[];
  topFixes: Fix[];
}

export interface PageContext {
  url: string;
  finalUrl: string;
  html: string;
  status: number;
  contentType: string;
  fetchTimeMs: number;
  robotsTxt: string | null;
}
