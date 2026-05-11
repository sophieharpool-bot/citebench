import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const title = "Citebench — How citable is your page?";
const description =
  "Audit any URL on how citable it is by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude). Transparent scoring, real fixes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://citebench.com"),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://citebench.com",
    siteName: "Citebench",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Citebench",
              url: "https://citebench.com",
              description,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://citebench.com/?url={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Citebench",
              url: "https://citebench.com",
              logo: "https://citebench.com/opengraph-image",
            }),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
