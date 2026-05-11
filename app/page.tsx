"use client";

import { useState } from "react";
import type { AuditResult, RuleResult } from "@/lib/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Audit failed");
      } else {
        setResult(data as AuditResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
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
        Transparent scoring. No LLM at audit time. Methodology v2 — revisited quarterly.
      </footer>
    </main>
  );
}

function Result({ result }: { result: AuditResult }) {
  return (
    <>
      <div className="score-card">
        <div className="score">
          {result.score}
          <span className="out-of"> / 100</span>
        </div>
        <div className="url">{result.finalUrl}</div>
      </div>

      {result.disqualified && (
        <div className="disqualified">
          <strong>Disqualified.</strong> {result.disqualificationReason}
        </div>
      )}

      {result.dimensions.map((d) => (
        <div key={d.dimension} className="dimension">
          <div className="dimension-header">
            <div>
              <span className="label">{d.label}</span>
              <span className="weight">{d.weight}% weight</span>
            </div>
            <div className="points">
              {d.earnedPoints} / {d.maxPoints}
            </div>
          </div>
          <div className="rules">
            {d.results.map((r) => (
              <RuleRow key={r.ruleId} rule={r} />
            ))}
          </div>
        </div>
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

function RuleRow({ rule }: { rule: RuleResult }) {
  const isFatal = rule.details?.fatal === true;
  const markerClass = isFatal ? "fatal" : rule.passed ? "pass" : "fail";
  const marker = isFatal ? "✕" : rule.passed ? "✓" : "·";
  return (
    <div className="rule">
      <span className={`marker ${markerClass}`}>{marker}</span>
      <div className="body">
        <div className="rule-label">
          {rule.label}
          {rule.maxPoints > 0 && (
            <span className="rule-points">
              {rule.earnedPoints} / {rule.maxPoints}
            </span>
          )}
          {rule.maxPoints === 0 && rule.earnedPoints < 0 && (
            <span className="rule-points">{rule.earnedPoints} pt</span>
          )}
        </div>
        <div className="rule-message">{rule.message}</div>
      </div>
    </div>
  );
}
