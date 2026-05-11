import robotsParser from "robots-parser";
import { PageContext, RuleResult } from "../types";
import { Doc } from "../parse";

const LIVE_RETRIEVAL_BOTS = ["ChatGPT-User", "Claude-User", "Perplexity-User"];
const TRAINING_BOTS = ["GPTBot", "Google-Extended", "ClaudeBot", "CCBot"];

export function runTechnicalRules(ctx: PageContext, $: Doc): RuleResult[] {
  return [
    httpsCheck(ctx),
    jsRenderCheck($),
    liveRetrievalRobotsCheck(ctx),
    trainingRobotsCheck(ctx),
    performanceCheck(ctx),
  ];
}

function httpsCheck(ctx: PageContext): RuleResult {
  const ok = ctx.finalUrl.startsWith("https://");
  return {
    ruleId: "tech.https",
    dimension: "technical",
    label: "HTTPS",
    maxPoints: 0,
    earnedPoints: 0,
    passed: ok,
    message: ok ? "Served over HTTPS" : "NOT served over HTTPS — fatal for AI citation",
  };
}

function jsRenderCheck($: Doc): RuleResult {
  $("script, style, noscript, template").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const passed = wordCount >= 200;
  return {
    ruleId: "tech.js-render",
    dimension: "technical",
    label: "Renders without JS",
    maxPoints: 3,
    earnedPoints: passed ? 3 : 0,
    passed,
    message: passed
      ? `Main content visible to non-JS fetch (${wordCount} words)`
      : `Almost no content visible without JS (${wordCount} words) — AI crawlers may see nothing`,
    details: { wordCount },
  };
}

function liveRetrievalRobotsCheck(ctx: PageContext): RuleResult {
  const blocked = botsBlockedByRobots(ctx, LIVE_RETRIEVAL_BOTS);
  const anyBlocked = blocked.length > 0;
  const earned = anyBlocked ? -5 : 3;
  return {
    ruleId: "tech.robots-live",
    dimension: "technical",
    label: "robots.txt allows live-retrieval AI bots",
    maxPoints: 3,
    earnedPoints: earned,
    passed: !anyBlocked,
    message: anyBlocked
      ? `Blocks live-retrieval bots: ${blocked.join(", ")} — these are the bots that actually fetch pages for citations`
      : "All major live-retrieval AI bots allowed",
    details: { blocked },
  };
}

function trainingRobotsCheck(ctx: PageContext): RuleResult {
  const blocked = botsBlockedByRobots(ctx, TRAINING_BOTS);
  const anyBlocked = blocked.length > 0;
  const earned = anyBlocked ? -Math.min(3, blocked.length) : 2;
  return {
    ruleId: "tech.robots-training",
    dimension: "technical",
    label: "robots.txt allows training bots",
    maxPoints: 2,
    earnedPoints: earned,
    passed: !anyBlocked,
    message: anyBlocked
      ? `Blocks training bots: ${blocked.join(", ")} — long-term posture only; ~90% of blocking sites still get cited today`
      : "All major training bots allowed",
    details: { blocked },
  };
}

function performanceCheck(ctx: PageContext): RuleResult {
  const ok = ctx.fetchTimeMs < 1500;
  return {
    ruleId: "tech.performance",
    dimension: "technical",
    label: "Fetch time under 1.5s",
    maxPoints: 2,
    earnedPoints: ok ? 2 : 0,
    passed: ok,
    message: ok
      ? `Fetched in ${ctx.fetchTimeMs}ms`
      : `Slow fetch (${ctx.fetchTimeMs}ms) — AI crawlers have 1–5s timeouts`,
    details: { fetchTimeMs: ctx.fetchTimeMs },
  };
}

function botsBlockedByRobots(ctx: PageContext, bots: string[]): string[] {
  if (!ctx.robotsTxt) return [];
  const u = new URL(ctx.finalUrl);
  const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
  const robots = robotsParser(robotsUrl, ctx.robotsTxt);
  const blocked: string[] = [];
  for (const bot of bots) {
    if (robots.isDisallowed(ctx.finalUrl, bot) === true) {
      blocked.push(bot);
    }
  }
  return blocked;
}
