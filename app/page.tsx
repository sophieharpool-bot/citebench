"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditResult, RuleResult } from "@/lib/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const runAudit = useCallback(async (targetUrl: string) => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Audit failed");
      } else {
        setResult(data as AuditResult);
        const shareUrl = `${window.location.pathname}?url=${encodeURIComponent(targetUrl)}`;
        window.history.replaceState(null, "", shareUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("url");
    if (urlParam) {
      setUrl(urlParam);
      runAudit(urlParam);
    }
  }, [runAudit]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runAudit(url);
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Citebench",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Audit any URL on how citable it is by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude). Transparent scoring, real fixes.",
            url: "https://citebench.com",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
      <header>
        <h1>Citebench</h1>
        <p>How citable is your page by AI answer engines? Paste a URL.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <input
          type="url"
          required
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !url}>
          {loading ? "Auditing…" : "Audit"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && <Result result={result} />}

      <footer>
        Transparent scoring. No LLM at audit time.{" "}
        <a href="/methodology">Methodology v2</a> · <a href="/blog">Blog</a>
      </footer>
    </main>
  );
}

function Result({ result }: { result: AuditResult }) {
  const reportHref = `mailto:feedback@citebench.com?subject=${encodeURIComponent(
    `Wrong classification: ${result.finalUrl}`,
  )}&body=${encodeURIComponent(
    `URL audited: ${result.finalUrl}\nClassified as: ${result.pageTypeLabel}\nExpected: \n\nDetails:\n`,
  )}`;

  return (
    <>
      <div className="score-card">
        <div className="score">
          {result.score}
          <span className="out-of"> / 100</span>
        </div>
        <div className="url">{result.finalUrl}</div>
        <div className="page-type">
          <span className="type-badge">{result.pageTypeLabel}</span>
          <span className="type-desc">{result.pageTypeDescription}</span>
          <a className="report-classification" href={reportHref}>
            Wrong classification?
          </a>
        </div>
      </div>

      {result.disqualified && (
        <div className="disqualified">
          <strong>Disqualified.</strong> {result.disqualificationReason}
        </div>
      )}

      <div className="score-meta">
        <span>
          Score breakdown below.{" "}
          <a href="/methodology">How this is calculated →</a>
        </span>
        <ShareButton auditedUrl={result.finalUrl} />
      </div>

      {result.dimensions.map((d) => (
        <Dimension key={d.dimension} d={d} />
      ))}

      {result.topFixes.length > 0 && (
        <div className="fixes">
          <h3>Top fixes</h3>
          <ol>
            {result.topFixes.map((f) => (
              <li key={f.ruleId}>
                {f.description}
                <span className="lift">+{f.estimatedPointLift} pt</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

function ShareButton({ auditedUrl }: { auditedUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const shareUrl = `${window.location.origin}/?url=${encodeURIComponent(auditedUrl)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this URL:", shareUrl);
    }
  }

  return (
    <button type="button" className="share-button" onClick={handleClick}>
      {copied ? "Copied!" : "Share audit"}
    </button>
  );
}

function Dimension({ d }: { d: import("@/lib/types").DimensionScore }) {
  const hasApplicable = d.results.some((r) => r.applicable !== false);
  return (
    <div className={`dimension ${!hasApplicable ? "dimension-na" : ""}`}>
      <div className="dimension-header">
        <div>
          <span className="label">{d.label}</span>
          <span className="weight">{d.weight}% weight</span>
        </div>
        <div className="points">
          {d.maxPoints === 0 ? "—" : `${d.earnedPoints} / ${d.maxPoints}`}
        </div>
      </div>
      <div className="rules">
        {d.results.map((r) => (
          <RuleRow key={r.ruleId} rule={r} />
        ))}
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleResult }) {
  const applicable = rule.applicable !== false;
  const isFatal = rule.details?.fatal === true;
  let markerClass: string;
  let marker: string;
  if (!applicable) {
    markerClass = "na";
    marker = "—";
  } else if (isFatal) {
    markerClass = "fatal";
    marker = "✕";
  } else if (rule.passed) {
    markerClass = "pass";
    marker = "✓";
  } else {
    markerClass = "fail";
    marker = "·";
  }
  return (
    <div className={`rule ${!applicable ? "rule-na" : ""}`}>
      <span className={`marker ${markerClass}`}>{marker}</span>
      <div className="body">
        <div className="rule-label">
          {rule.label}
          {applicable && rule.maxPoints > 0 && (
            <span className="rule-points">
              {rule.earnedPoints} / {rule.maxPoints}
            </span>
          )}
          {applicable && rule.maxPoints === 0 && rule.earnedPoints < 0 && (
            <span className="rule-points">{rule.earnedPoints} pt</span>
          )}
          {!applicable && <span className="na-tag">N/A for this page type</span>}
        </div>
        <div className="rule-message">{rule.message}</div>
      </div>
    </div>
  );
}
