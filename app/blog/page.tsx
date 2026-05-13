import Link from "next/link";
import type { Metadata } from "next";
import { listPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Citebench",
  description:
    "Methodology essays and analysis from Citebench on how AI answer engines surface and cite content.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await listPosts();
  return (
    <main className="prose-page">
      <nav className="prose-nav">
        <Link href="/">← Back to audit</Link>
      </nav>
      <header className="blog-index-header">
        <h1>Blog</h1>
        <p>
          Methodology essays and analysis. How AI answer engines surface and cite
          content, and what that means for the pages you write.
        </p>
      </header>
      {posts.length === 0 ? (
        <p className="blog-empty">No posts yet.</p>
      ) : (
        <ul className="blog-list">
          {posts.map((p) => (
            <li key={p.slug} className="blog-list-item">
              <Link href={`/blog/${p.slug}`} className="blog-list-link">
                <span className="blog-list-date">{p.publishDate}</span>
                <span className="blog-list-title">{p.title}</span>
                <span className="blog-list-description">{p.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
