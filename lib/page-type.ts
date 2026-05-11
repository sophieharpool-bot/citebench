import { Doc, hasSchemaType } from "./parse";

export type PageType = "article" | "homepage" | "landing" | "machine-version" | "other";

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  article: "Article / blog post",
  homepage: "Homepage",
  landing: "Landing / product page",
  "machine-version": "AI-targeted machine version",
  other: "Other",
};

export const PAGE_TYPE_DESCRIPTIONS: Record<PageType, string> = {
  article:
    "Long-form editorial content. Scored against the full Citebench v2 rubric.",
  homepage:
    "Marketing homepage. Scored on Organization schema, brand entity signals, and content clarity. Article-specific rules (answer capsules, FAQ) are skipped.",
  landing:
    "Product or campaign landing page. Similar to homepage scoring with emphasis on schema and brand identification.",
  "machine-version":
    "This site serves AI-targeted markdown content to non-browser user agents. Scored on factual quality and AI-friendliness rather than HTML semantics.",
  other:
    "Unclassified page type. Some scoring rules may not apply.",
};

export function detectPageType(pageUrl: string, $: Doc): PageType {
  if (looksLikeMachineVersion($)) return "machine-version";

  let path = "/";
  try {
    path = new URL(pageUrl).pathname.toLowerCase();
  } catch {
    // fall through
  }

  if (hasSchemaType($, "Article", "BlogPosting", "NewsArticle", "Report", "TechArticle")) {
    return "article";
  }

  if (/\/(blog|article|articles|news|posts?|insights?|stories|magazine|journal|guide|guides|tutorial|tutorials)\b/.test(path)) {
    return "article";
  }

  if (/\/\d{4}\/\d{1,2}\/\d{1,2}\//.test(path) || /\/\d{4}-\d{2}-\d{2}[-/]/.test(path)) {
    return "article";
  }

  if (path === "/" || path === "" || path === "/index.html" || path === "/index") {
    return "homepage";
  }

  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const paragraphCount = $("p").length;
  if (h1Count >= 1 && h2Count >= 3 && paragraphCount >= 5) {
    return "article";
  }

  if (hasSchemaType($, "Product", "Service", "Offer", "WebPage", "AboutPage", "ContactPage")) {
    return "landing";
  }

  if (h1Count === 0 && paragraphCount < 3) {
    return "landing";
  }

  return "other";
}

function looksLikeMachineVersion($: Doc): boolean {
  const hasTitle = $("title").text().trim().length > 0;
  const hasH1 = $("h1").length > 0;
  const hasSchema = $('script[type="application/ld+json"]').length > 0;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  const markdownHeaders = (bodyText.match(/(?:^|\s)#{1,3}\s+[A-Z]/g) ?? []).length;
  const markdownLinks = (bodyText.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  const boldPatterns = (bodyText.match(/\*\*[^*\n]+\*\*/g) ?? []).length;
  const ruleDividers = (bodyText.match(/(?:^|\s)---(?:\s|$)/g) ?? []).length;

  const markdownScore = markdownHeaders + markdownLinks + boldPatterns + ruleDividers * 2;

  if (!hasTitle && !hasH1 && !hasSchema && wordCount > 500 && markdownScore >= 4) {
    return true;
  }
  return false;
}
