import { PageContext } from "./types";

const USER_AGENT = "Citebench/0.1 (+https://citebench.com)";
const FETCH_TIMEOUT_MS = 15000;

export async function fetchPage(url: string): Promise<PageContext> {
  const start = Date.now();
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const html = await response.text();
  const fetchTimeMs = Date.now() - start;

  const robotsTxt = await fetchRobotsTxt(response.url);

  return {
    url,
    finalUrl: response.url,
    html,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    fetchTimeMs,
    robotsTxt,
  };
}

async function fetchRobotsTxt(pageUrl: string): Promise<string | null> {
  try {
    const u = new URL(pageUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
