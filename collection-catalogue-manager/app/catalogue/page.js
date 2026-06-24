"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { card, label, input, btn } from "../ui";
import { getEnv, envHeader, getToken, setToken as saveTokenForEnv } from "../env";
import { useDataInvalidation } from "../hooks/useDataInvalidation";

const DEFAULT_PINCODE = "122001";
const DEFAULT_LAB_PARTNER = "LAB_PARTNER_HEALTHIANS";

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

// Upstream wraps each product under product_summary.
function summary(p) {
  return p.product_summary || p;
}
function getId(p) {
  const s = summary(p);
  return s.product_id || s.id;
}
function getName(p) {
  const s = summary(p);
  return s.product_name || s.name || "—";
}
function getType(p) {
  const s = summary(p);
  return (s.product_type || s.type || "").replace("PRODUCT_TYPE_", "");
}
function getMrp(p) {
  const s = summary(p);
  return s.mrp || s.pricing?.mrp;
}
function getSellingPrice(p) {
  const s = summary(p);
  return s.final_price || s.selling_price || s.pricing?.selling_price;
}
function fmtPrice(obj) {
  return obj?.units != null && obj.units !== "" ? `₹${Number(obj.units).toLocaleString("en-IN")}` : "—";
}

export default function CataloguePage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchId, setSearchId] = useState("");
  const [msg, setMsg] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [token, setToken] = useState("");
  const [authFailed, setAuthFailed] = useState(false);
  const [env, setEnvState] = useState("prod");

  const [editing, setEditing] = useState(null); // product being priced
  const [mrpInput, setMrpInput] = useState("");
  const [spInput, setSpInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function saveToken(v) {
    setToken(v);
    saveTokenForEnv(v, env);
  }

  function authHeader(tokenOverride) {
    // Fall back to a direct localStorage read (not just React state) so this
    // is correct even on the very first render, before the env/token-loading
    // effect below has had a chance to run and update state.
    const tok = (tokenOverride ?? token ?? "").trim() || getToken(getEnv()).trim();
    return { ...envHeader(), ...(tok ? { "x-tm-token": tok } : {}) };
  }

  const { markOperationSuccess, updateCache } = useDataInvalidation("catalogue", {
    fetchFn: () => fetchProducts(),
    onRestoreCache: (cached) => {
      setProducts(cached.list || []);
      flash("ok", `Loaded ${cached.list?.length ?? 0} product${cached.list?.length === 1 ? "" : "s"} (cached).`);
    },
  });

  function flash(kind, text) {
    setMsg({ kind, text });
  }

  async function fetchProducts(tokenOverride) {
    setLoading(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams({ pincode: DEFAULT_PINCODE, page: "1", limit: "5000", labPartner: DEFAULT_LAB_PARTNER });
      const res = await fetch(`/api/catalog/products?${qs.toString()}`, { headers: authHeader(tokenOverride) });
      const json = await res.json();
      setRawResponse(json.data);
      if (!json.ok) {
        if (json.status === 401) setAuthFailed(true);
        flash("err", `Fetch failed (${json.status}): ${json.data?.message || "see raw response"}`);
        setProducts([]);
        return;
      }
      setAuthFailed(false);
      const list = Array.isArray(json.data?.data) ? json.data.data : Array.isArray(json.data) ? json.data : [];
      setProducts(list);
      updateCache({ list });
      flash("ok", `Loaded ${list.length} product${list.length === 1 ? "" : "s"}.`);
    } catch (e) {
      flash("err", `Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const e = getEnv();
    setEnvState(e);
    const saved = getToken(e);
    if (saved) setToken(saved);
    // useDataInvalidation hook handles the initial fetch / cache restore
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const name = searchName.trim().toLowerCase();
    const id = searchId.trim().toLowerCase();
    return products.filter((p) => {
      if (name && !getName(p).toLowerCase().includes(name)) return false;
      if (id && !(getId(p) || "").toLowerCase().includes(id)) return false;
      return true;
    });
  }, [products, searchName, searchId]);

  function openEdit(p) {
    setEditing(p);
    setMrpInput(getMrp(p)?.units ?? "");
    setSpInput(getSellingPrice(p)?.units ?? "");
    setMsg(null);
  }

  async function submitPricing() {
    if (!editing) return;
    if (mrpInput === "" || spInput === "") return flash("err", "MRP and Selling price are both required.");

    const payload = {
      product_id: getId(editing),
      pincode: DEFAULT_PINCODE,
      labPartner: DEFAULT_LAB_PARTNER,
      mrp: { currency_code: "INR", units: String(mrpInput), nanos: 0 },
      final_price: { currency_code: "INR", units: String(spInput), nanos: 0 },
    };

    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/catalog/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setRawResponse(json.data);
      if (!json.ok) {
        if (json.status === 401) setAuthFailed(true);
        flash("err", `Update failed (${json.status}): ${json.data?.message || "see raw response"}`);
        return;
      }
      flash("ok", `Updated pricing for ${getName(editing)}.`);
      setEditing(null);
      markOperationSuccess();
      await fetchProducts();
    } catch (e) {
      flash("err", `Network error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 80px" }}>
      <button style={{ ...btn("#f2f4f7", "#344054"), marginBottom: 16 }} onClick={() => router.push("/")}>
        ← Home
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Catalogue Management</h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 999,
            background: env === "stage" ? "#fff7ed" : "#ecfdf3",
            color: env === "stage" ? "#c2410c" : "#067647",
          }}
        >
          {env.toUpperCase()}
        </span>
      </div>

      {/* Message banner */}
      {msg && (
        <div
          style={{
            ...card,
            marginBottom: 20,
            background: msg.kind === "ok" ? "#ecfdf3" : "#fef3f2",
            border: `1px solid ${msg.kind === "ok" ? "#abefc6" : "#fecdca"}`,
            color: msg.kind === "ok" ? "#067647" : "#b42318",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Manual Authorization fallback — only shown once the fixed API key fails */}
      {authFailed && (
        <div style={{ ...card, border: "1px solid #fecdca", background: "#fffaf9" }}>
          <label style={label}>Authorization token (fallback)</label>
          <textarea
            style={{ ...input, fontFamily: "monospace", fontSize: 12, minHeight: 64, resize: "vertical" }}
            placeholder="The server's API key was rejected — paste a Bearer/JWT token here to use instead"
            value={token}
            onChange={(e) => saveToken(e.target.value)}
          />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#667085" }}>
            Stored only in this browser. This overrides the server's fixed key for every request below until cleared.
          </p>
        </div>
      )}

      {/* Search + filters */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "2 1 240px" }}>
            <label style={label}>Search by name</label>
            <input style={input} value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="e.g. Full Body Checkup" />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <label style={label}>Product ID</label>
            <input style={input} value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="e.g. 74c31da8-..." />
          </div>
          <button
            style={{ ...btn("#f2f4f7", "#344054"), display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={() => fetchProducts()}
            disabled={loading}
            title="Refresh products"
          >
            <RefreshIcon /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#475467", borderBottom: "1px solid #eaecf0" }}>
                <th style={{ padding: "8px 8px" }}>Product</th>
                <th style={{ padding: "8px 8px" }}>Type</th>
                <th style={{ padding: "8px 8px" }}>MRP</th>
                <th style={{ padding: "8px 8px" }}>Selling price</th>
                <th style={{ padding: "8px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={getId(p)} style={{ borderBottom: "1px solid #f2f4f7" }}>
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ fontWeight: 600 }}>{getName(p)}</div>
                    <div style={{ color: "#98a2b3", fontSize: 11 }}>{getId(p)}</div>
                  </td>
                  <td style={{ padding: "10px 8px", color: "#667085" }}>{getType(p)}</td>
                  <td style={{ padding: "10px 8px" }}>{fmtPrice(getMrp(p))}</td>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{fmtPrice(getSellingPrice(p))}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <button style={btn("#2563eb")} onClick={() => openEdit(p)}>
                      Update price
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "16px 8px", color: "#98a2b3" }}>
                    {loading ? "Loading…" : "No products found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit price modal */}
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16,24,40,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
          onClick={() => !submitting && setEditing(null)}
        >
          <div style={{ ...card, maxWidth: 420, width: "100%", marginBottom: 0 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{getName(editing)}</h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#98a2b3" }}>
              <code>{getId(editing)}</code>
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={label}>MRP (₹)</label>
                <input style={input} type="number" value={mrpInput} onChange={(e) => setMrpInput(e.target.value)} />
              </div>
              <div>
                <label style={label}>Selling price (₹)</label>
                <input style={input} type="number" value={spInput} onChange={(e) => setSpInput(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button style={btn("#059669")} onClick={submitPricing} disabled={submitting}>
                {submitting ? "Updating…" : "Save price"}
              </button>
              <button style={btn("#f2f4f7", "#344054")} onClick={() => setEditing(null)} disabled={submitting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw response (debugging) */}
      {rawResponse && (
        <details style={card}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Raw API response</summary>
          <pre style={{ overflowX: "auto", fontSize: 12, background: "#0b1020", color: "#cdd6f4", padding: 16, borderRadius: 8, marginTop: 12 }}>
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
