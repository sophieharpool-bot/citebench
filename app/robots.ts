import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://citebench.com/sitemap.xml",
    host: "https://citebench.com",
  };
}
