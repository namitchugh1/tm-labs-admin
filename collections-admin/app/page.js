"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { card } from "./ui";
import { getEnv, setEnv } from "./env";

const SECTIONS = [
  {
    href: "/collections",
    title: "Collections",
    description: "Create and manage homepage collections — fields, members, priority.",
  },
  {
    href: "/catalogue",
    title: "Catalogue Management",
    description: "Search products and update MRP / selling price.",
  },
];

const THEME = {
  stage: { bg: "#fffaf5", border: "#fdd9b5", accent: "#c2410c", dot: "#f97316" },
  prod: { bg: "#f3fbf7", border: "#b7ebd0", accent: "#067647", dot: "#10b981" },
};

export default function Home() {
  const [env, setEnvState] = useState("prod");

  useEffect(() => {
    setEnvState(getEnv());
  }, []);

  function choose(next) {
    setEnv(next);
    setEnvState(next);
  }

  const t = THEME[env];

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>
      <h1 style={{ fontSize: 26, margin: "0 0 24px" }}>Truemeds Diagnostics Admin</h1>

      {/* Environment banner — visually distinct from the section cards below */}
      <div
        style={{
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderLeft: `4px solid ${t.accent}`,
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: t.dot,
              boxShadow: `0 0 0 4px ${t.dot}22`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, letterSpacing: 0.3, textTransform: "uppercase" }}>
              {env === "stage" ? "Stage environment" : "Production environment"}
            </div>
          </div>
        </div>

        {/* Segmented control */}
        <div
          style={{
            display: "inline-flex",
            background: "#fff",
            border: "1px solid #e3e8ef",
            borderRadius: 999,
            padding: 3,
            gap: 2,
          }}
        >
          {["stage", "prod"].map((opt) => (
            <button
              key={opt}
              onClick={() => choose(opt)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: env === opt ? THEME[opt].accent : "transparent",
                color: env === opt ? "#fff" : "#667085",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {opt === "stage" ? "Stage" : "Prod"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ ...card, marginBottom: 0, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h2 style={{ fontSize: 18, margin: 0, color: "#1a2230" }}>{s.title}</h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: t.bg,
                    color: t.accent,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  {env.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#667085" }}>{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
