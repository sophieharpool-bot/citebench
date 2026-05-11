import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Citebench — How citable is your page?",
  description:
    "Audit any URL on how citable it is by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude). Transparent scoring, real fixes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
