// Shared inline-style helpers used across pages.
export const card = {
  background: "#fff",
  border: "1px solid #e3e8ef",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  marginBottom: 20,
};

export const label = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#344054" };

export const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d0d5dd",
  fontSize: 14,
  background: "#fff",
  color: "#1a2230",
};

export const btn = (bg, fg = "#fff") => ({
  background: bg,
  color: fg,
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
});

export function splitIds(s) {
  return s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
