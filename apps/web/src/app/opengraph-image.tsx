import { ImageResponse } from "next/og";

export const alt = "EndlessWorlds — Engineering leadership & AI-native architecture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0B1220 0%, #1E3A5F 100%)",
          padding: "80px",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "9999px",
              background: "#38BDF8",
            }}
          />
          <div style={{ fontSize: "34px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            EndlessWorlds
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            <span>Engineering leadership &amp;</span>
            <span>AI-native architecture.</span>
          </div>
          <div style={{ fontSize: "30px", color: "#94A3B8" }}>
            30 years turning legacy + AI into production systems.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "24px", color: "#38BDF8", fontFamily: "monospace" }}>
          endlessworlds.xyz
        </div>
      </div>
    ),
    size,
  );
}
