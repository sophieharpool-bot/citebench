import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
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
  ];
}
