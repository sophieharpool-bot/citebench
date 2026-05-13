import { promises as fs } from "fs";
import path from "path";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishDate: string;
  draft: boolean;
  body: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) meta[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: match[2] };
}

function toPost(raw: string, filenameSlug: string): BlogPost {
  const { meta, body } = parseFrontmatter(raw);
  return {
    slug: meta.slug || filenameSlug,
    title: meta.title || "Untitled",
    description: meta.description || "",
    author: meta.author || "Citebench",
    publishDate: meta.publishDate || "",
    draft: meta.draft?.toLowerCase() === "true",
    body,
  };
}

async function listFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BLOG_DIR);
    return entries.filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

export async function listPosts(): Promise<BlogPost[]> {
  const files = await listFiles();
  const posts = await Promise.all(
    files.map(async (filename) => {
      const raw = await fs.readFile(path.join(BLOG_DIR, filename), "utf8");
      const filenameSlug = filename.replace(/\.md$/, "").replace(/^\d+-/, "");
      return toPost(raw, filenameSlug);
    }),
  );
  return posts
    .filter((p) => !p.draft)
    .sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await listPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}
