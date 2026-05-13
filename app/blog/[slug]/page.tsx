import { marked } from "marked";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, listPosts } from "@/lib/blog";

export async function generateStaticParams() {
  const posts = await listPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Citebench`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `https://citebench.com/blog/${post.slug}`,
      title: post.title,
      description: post.description,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const html = await marked.parse(post.body, { gfm: true, breaks: false });

  return (
    <main className="prose-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            author: { "@type": "Organization", name: post.author },
            publisher: {
              "@type": "Organization",
              name: "Citebench",
              logo: {
                "@type": "ImageObject",
                url: "https://citebench.com/opengraph-image",
              },
            },
            datePublished: post.publishDate,
            url: `https://citebench.com/blog/${post.slug}`,
          }),
        }}
      />
      <nav className="prose-nav">
        <Link href="/blog">← All posts</Link>
      </nav>
      <header className="blog-post-header">
        <div className="blog-post-date">{post.publishDate}</div>
        <h1 className="blog-post-title">{post.title}</h1>
        <p className="blog-post-description">{post.description}</p>
      </header>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
