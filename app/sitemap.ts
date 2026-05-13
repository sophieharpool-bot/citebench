import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await listPosts();
  return [
    {
      url: "https://citebench.com/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://citebench.com/methodology",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://citebench.com/blog",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts.map((p) => ({
      url: `https://citebench.com/blog/${p.slug}`,
      lastModified: p.publishDate ? new Date(p.publishDate) : now,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
