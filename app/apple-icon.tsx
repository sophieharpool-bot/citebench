import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a1a1a",
          color: "#fafaf7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        C
      </div>
    ),
    { ...size },
  );
}
