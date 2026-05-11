import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export type Doc = CheerioAPI;

export function parse(html: string): Doc {
  return cheerio.load(html);
}

export function getMainText($: Doc): string {
  $("script, style, noscript, template").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

export function getParagraphs($: Doc): string[] {
  return $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((p) => p.length > 0);
}

export function countSentences(text: string): number {
  return text.split(/[.!?]+\s/).filter((s) => s.trim().length > 0).length;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export function getJsonLd($: Doc): unknown[] {
  const out: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        out.push(...parsed);
      } else {
        out.push(parsed);
      }
    } catch {
      // malformed JSON-LD; skip
    }
  });
  return out;
}

export function hasSchemaType($: Doc, ...types: string[]): boolean {
  const ld = getJsonLd($);
  const wanted = new Set(types.map((t) => t.toLowerCase()));
  function check(node: unknown): boolean {
    if (!node || typeof node !== "object") return false;
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string" && wanted.has(t.toLowerCase())) return true;
    if (Array.isArray(t) && t.some((x) => typeof x === "string" && wanted.has(x.toLowerCase()))) return true;
    if (Array.isArray(obj["@graph"])) {
      return (obj["@graph"] as unknown[]).some(check);
    }
    return false;
  }
  return ld.some(check);
}

export function findSchemaNode($: Doc, type: string): Record<string, unknown> | null {
  const ld = getJsonLd($);
  const wanted = type.toLowerCase();
  function find(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== "object") return null;
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string" && t.toLowerCase() === wanted) return obj;
    if (Array.isArray(t) && t.some((x) => typeof x === "string" && x.toLowerCase() === wanted)) return obj;
    if (Array.isArray(obj["@graph"])) {
      for (const child of obj["@graph"] as unknown[]) {
        const hit = find(child);
        if (hit) return hit;
      }
    }
    return null;
  }
  for (const node of ld) {
    const hit = find(node);
    if (hit) return hit;
  }
  return null;
}
