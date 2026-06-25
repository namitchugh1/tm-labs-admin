"use client";

import Link from "next/link";

export default function StatusUpdaterPage() {
  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 20px",
          background: "#fffaf5",
          borderBottom: "1px solid #fdd9b5",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ color: "#c2410c", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Back
          </Link>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f97316",
              boxShadow: "0 0 0 4px #f9731622",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", letterSpacing: 0.3, textTransform: "uppercase" }}>
            Stage environment only
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#9a4a1a" }}>
          Simulates Healthians staging webhooks — never wired to production
        </span>
      </div>
      <iframe
        src="/status-updater.html"
        title="Diagnostics Webhook Status Updater"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </main>
  );
}
