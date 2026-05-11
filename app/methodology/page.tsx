import { promises as fs } from "fs";
import path from "path";
import { marked } from "marked";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology — Citebench",
  description:
    "How Citebench scores a URL: page-type-aware rubric, per-criterion rules, and the research basis for v2 weights.",
};

export default async function MethodologyPage() {
  const filePath = path.join(process.cwd(), "content", "methodology-v2.md");
  const md = await fs.readFile(filePath, "utf8");
  const html = await marked.parse(md, { gfm: true, breaks: false });

  return (
    <main className="prose-page">
      <nav className="prose-nav">
        <Link href="/">← Back to audit</Link>
      </nav>
      <article
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
