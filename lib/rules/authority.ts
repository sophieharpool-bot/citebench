import { PageContext, RuleResult } from "../types";
import { Doc, findSchemaNode, getJsonLd } from "../parse";

const AUTHORITATIVE_TLDS = [".gov", ".edu", ".mil"];
const AUTHORITATIVE_DOMAINS = [
  "wikipedia.org",
  "wikidata.org",
  "reuters.com",
  "nature.com",
  "science.org",
  "nih.gov",
  "cdc.gov",
  "who.int",
  "nytimes.com",
  "wsj.com",
  "ft.com",
  "economist.com",
  "bbc.com",
  "bbc.co.uk",
  "scholar.google.com",
  "arxiv.org",
  "pubmed.ncbi.nlm.nih.gov",
  "doi.org",
];

const VERIFICATION_DOMAINS = ["wikipedia.org", "wikidata.org", "linkedin.com", "orcid.org"];

export function runAuthorityRules(ctx: PageContext, $: Doc): RuleResult[] {
  return [
    authorBylineCheck($),
    outboundCitationsCheck($, ctx),
    organizationSchemaCheck($),
    publishDateCheck($),
    wikipediaEntityCheck($),
  ];
}

function authorBylineCheck($: Doc): RuleResult {
  const personSchema = findSchemaNode($, "Person");
  const articleSchema = findSchemaNode($, "Article") ?? findSchemaNode($, "BlogPosting") ?? findSchemaNode($, "NewsArticle");
  const articleAuthor = articleSchema?.["author"];

  const hasPersonSchema = !!personSchema;
  const hasArticleAuthor = !!articleAuthor;

  const sameAs = extractSameAs(personSchema) ?? extractSameAs(articleAuthor);
  const hasCredentialedSameAs = sameAs.some((u) =>
    VERIFICATION_DOMAINS.some((d) => u.includes(d)),
  );

  const visibleByline =
    $('[rel="author"], .author, .byline, [itemprop="author"]').first().text().trim().length > 0;

  let earned = 0;
  const signals: string[] = [];
  if (hasPersonSchema || hasArticleAuthor) {
    earned += 3;
    signals.push("schema");
  }
  if (visibleByline) {
    earned += 2;
    signals.push("visible byline");
  }
  if (hasCredentialedSameAs) {
    earned += 3;
    signals.push("sameAs credentials");
  }

  earned = Math.min(8, earned);

  return {
    ruleId: "auth.byline",
    dimension: "authority",
    label: "Author byline + Person schema + credentials",
    maxPoints: 8,
    earnedPoints: earned,
    passed: earned >= 5,
    message:
      earned === 0
        ? "No author byline, Person schema, or credentials detected"
        : `Author signals: ${signals.join(", ")}`,
    details: { hasPersonSchema, hasArticleAuthor, visibleByline, hasCredentialedSameAs, sameAs },
  };
}

function outboundCitationsCheck($: Doc, ctx: PageContext): RuleResult {
  const pageHost = (() => {
    try {
      return new URL(ctx.finalUrl).host;
    } catch {
      return null;
    }
  })();

  const authoritativeLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    try {
      const u = new URL(href, ctx.finalUrl);
      if (pageHost && u.host === pageHost) return;
      const host = u.host.toLowerCase();
      const matchesTld = AUTHORITATIVE_TLDS.some((t) => host.endsWith(t));
      const matchesDomain = AUTHORITATIVE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
      if (matchesTld || matchesDomain) {
        authoritativeLinks.push(host);
      }
    } catch {
      // skip
    }
  });

  const count = new Set(authoritativeLinks).size;
  let earned: number;
  if (count >= 5) earned = 6;
  else if (count >= 3) earned = 4;
  else if (count >= 1) earned = 2;
  else earned = 0;

  return {
    ruleId: "auth.outbound-citations",
    dimension: "authority",
    label: "Outbound citations to authoritative domains",
    maxPoints: 6,
    earnedPoints: earned,
    passed: count >= 3,
    message:
      count === 0
        ? "No outbound links to .edu/.gov or known authoritative publishers"
        : `${count} unique authoritative outbound domain${count === 1 ? "" : "s"}`,
    details: { count, sample: Array.from(new Set(authoritativeLinks)).slice(0, 10) },
  };
}

function organizationSchemaCheck($: Doc): RuleResult {
  const org = findSchemaNode($, "Organization");
  if (!org) {
    return {
      ruleId: "auth.organization-schema",
      dimension: "authority",
      label: "Organization schema with sameAs chain",
      maxPoints: 5,
      earnedPoints: 0,
      passed: false,
      message: "No Organization schema found",
    };
  }
  const sameAs = extractSameAs(org);
  const hasWikipedia = sameAs.some((u) => /wikipedia\.org|wikidata\.org/.test(u));
  const hasMultipleVerified = sameAs.length >= 3;

  let earned = 2;
  if (hasWikipedia) earned += 2;
  if (hasMultipleVerified) earned += 1;
  earned = Math.min(5, earned);

  return {
    ruleId: "auth.organization-schema",
    dimension: "authority",
    label: "Organization schema with sameAs chain",
    maxPoints: 5,
    earnedPoints: earned,
    passed: earned >= 4,
    message:
      sameAs.length === 0
        ? "Organization schema present but no sameAs links"
        : `Organization schema with ${sameAs.length} sameAs link${sameAs.length === 1 ? "" : "s"}${hasWikipedia ? " (incl. Wikipedia/Wikidata)" : ""}`,
    details: { sameAs },
  };
}

function publishDateCheck($: Doc): RuleResult {
  const article = findSchemaNode($, "Article") ?? findSchemaNode($, "BlogPosting") ?? findSchemaNode($, "NewsArticle");
  const datePublished = article?.["datePublished"] as string | undefined;
  const dateModified = article?.["dateModified"] as string | undefined;
  const metaPublished = $('meta[property="article:published_time"]').attr("content");
  const metaModified = $('meta[property="article:modified_time"]').attr("content");
  const visibleDate = $("time[datetime]").first().attr("datetime");

  const anyDate = datePublished || dateModified || metaPublished || metaModified || visibleDate;
  const hasSchemaDate = !!datePublished;
  const passed = !!anyDate;

  let earned = 0;
  if (passed) earned = 2;
  if (hasSchemaDate) earned = 3;

  return {
    ruleId: "auth.publish-date",
    dimension: "authority",
    label: "Visible publish/update date",
    maxPoints: 3,
    earnedPoints: earned,
    passed,
    message: !passed
      ? "No publish or update date found in schema, meta, or visible markup"
      : hasSchemaDate
      ? `Schema datePublished: ${datePublished}${dateModified ? `, dateModified: ${dateModified}` : ""}`
      : `Date found in markup: ${anyDate}`,
    details: { datePublished, dateModified, metaPublished, metaModified, visibleDate },
  };
}

function wikipediaEntityCheck($: Doc): RuleResult {
  const ld = getJsonLd($);
  const links: string[] = [];
  function collect(node: unknown) {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const sameAs = obj["sameAs"];
    if (typeof sameAs === "string") links.push(sameAs);
    if (Array.isArray(sameAs)) links.push(...sameAs.filter((x): x is string => typeof x === "string"));
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "object") collect(v);
    }
  }
  for (const node of ld) collect(node);

  const wpLink = links.find((u) => /wikipedia\.org|wikidata\.org/.test(u));
  return {
    ruleId: "auth.wikipedia-entity",
    dimension: "authority",
    label: "Wikipedia/Wikidata entity match",
    maxPoints: 3,
    earnedPoints: wpLink ? 3 : 0,
    passed: !!wpLink,
    message: wpLink
      ? `sameAs link to ${new URL(wpLink).host}`
      : "No sameAs link to Wikipedia or Wikidata in schema",
    details: { wpLink },
  };
}

function extractSameAs(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const sameAs = obj["sameAs"];
  if (typeof sameAs === "string") return [sameAs];
  if (Array.isArray(sameAs)) return sameAs.filter((x): x is string => typeof x === "string");
  return [];
}
