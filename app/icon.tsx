import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        C
      </div>
    ),
    { ...size },
  );
}
