import { PageType } from "./page-type";

export type Dimension =
  | "authority"
  | "factual"
  | "answer-fit"
  | "structural"
  | "technical";

export const DIMENSION_WEIGHTS_BY_TYPE: Record<PageType, Record<Dimension, number>> = {
  article: { authority: 25, factual: 25, "answer-fit": 20, structural: 20, technical: 10 },
  homepage: { authority: 40, factual: 15, "answer-fit": 10, structural: 25, technical: 10 },
  landing: { authority: 35, factual: 20, "answer-fit": 10, structural: 25, technical: 10 },
  "machine-version": { authority: 30, factual: 35, "answer-fit": 5, structural: 5, technical: 25 },
  other: { authority: 25, factual: 25, "answer-fit": 20, structural: 20, technical: 10 },
};

export const RULE_APPLICABILITY: Record<string, PageType[]> = {
  "auth.byline": ["article"],
  "auth.outbound-citations": ["article", "machine-version", "other"],
  "auth.publish-date": ["article"],
  "auth.organization-schema": ["article", "homepage", "landing", "other"],
  "auth.wikipedia-entity": ["article", "homepage", "landing", "other"],
  "fact.original-data": ["article", "homepage", "landing", "machine-version"],
  "fit.answer-capsules": ["article"],
  "fit.tldr": ["article", "homepage", "landing"],
  "fit.faq": ["article", "homepage", "other"],
  "fit.lists-tables": ["article", "homepage", "landing", "other"],
  "struct.heading-hierarchy": ["article", "homepage", "landing", "other"],
  "struct.paragraph-length": ["article", "other"],
  "struct.internal-links": ["article", "homepage", "landing", "other"],
  "struct.title-tag": ["article", "homepage", "landing", "other"],
  "struct.schema-stack": ["article", "homepage", "landing", "other"],
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
  applicable?: boolean;
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
  pageType: PageType;
  pageTypeLabel: string;
  pageTypeDescription: string;
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
