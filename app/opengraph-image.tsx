import { ImageResponse } from "next/og";

export const alt = "Citebench — How citable is your page by AI answer engines?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fafaf7",
          color: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em" }}>
          citebench
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            How citable is your page by AI answer engines?
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#6a6a6a", marginTop: 20 }}>
            Audit any URL. Transparent scoring. Real fixes.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#6a6a6a" }}>citebench.com</div>
      </div>
    ),
    { ...size },
  );
}
