import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#D4FA1E",
          color: "#111",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 700 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 36, marginTop: 24, color: "#2A2A2A" }}>
          Bookmarks that organize themselves.
        </div>
      </div>
    ),
    size,
  );
}
