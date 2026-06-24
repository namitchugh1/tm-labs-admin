"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { card, label, input, btn, splitIds } from "../ui";
import { getEnv, envHeader, getToken, setToken as saveTokenForEnv } from "../env";
import { useDataInvalidation } from "../hooks/useDataInvalidation";

const VARIANTS = [
  "COLLECTION_VARIANT_PRODUCT_HOME",
  "COLLECTION_VARIANT_PRODUCT",
  "COLLECTION_VARIANT_BANNER",
  "COLLECTION_VARIANT_GRID",
];

const STATUS_OPTIONS = [
  { label: "Active (1)", value: 1 },
  { label: "Inactive (2)", value: 2 },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  priority: "",
  status: 1,
  variant: "COLLECTION_VARIANT_PRODUCT_HOME",
  image_url: "",
  actor: "",
  add_product_ids: "",
};

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

export default function CollectionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("COLLECTION_STATUS_ACTIVE");
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'ok'|'err', text }
  const [rawResponse, setRawResponse] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [token, setToken] = useState("");
  const [authFailed, setAuthFailed] = useState(false);
  const [env, setEnvState] = useState("prod");
  const skipNextFilterFetch = useRef(true);

  const { markOperationSuccess, updateCache } = useDataInvalidation("collections", {
    fetchFn: () => fetchCollections(),
    onRestoreCache: (cached) => {
      // Only trust the cache if it was captured for the filter we're
      // currently showing (default on mount); otherwise fetch fresh.
      if (cached.statusFilter && cached.statusFilter !== statusFilter) {
        fetchCollections();
        return;
      }
      setCollections(cached.list || []);
      flash("ok", `Loaded ${cached.list?.length ?? 0} collection${cached.list?.length === 1 ? "" : "s"} (cached).`);
    },
  });

  useEffect(() => {
    const e = getEnv();
    setEnvState(e);
    const saved = getToken(e);
    if (saved) setToken(saved);
  }, []);

  function saveToken(v) {
    setToken(v);
    saveTokenForEnv(v, env);
  }

  function authHeader() {
    const tok = (token || "").trim() || getToken(getEnv()).trim();
    return { ...envHeader(), ...(tok ? { "x-tm-token": tok } : {}) };
  }

  function flash(kind, text) {
    setMsg({ kind, text });
  }

  async function fetchCollections() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/collections?status=${encodeURIComponent(statusFilter)}`, {
        headers: authHeader(),
      });
      const json = await res.json();
      setRawResponse(json.data);
      if (!json.ok) {
        if (json.status === 401) setAuthFailed(true);
        flash("err", `Fetch failed (${json.status}): ${json.data?.message || "see raw response"}`);
        setCollections([]);
        return;
      }
      setAuthFailed(false);
      const list = Array.isArray(json.data?.data) ? json.data.data : [];
      setCollections(list);
      updateCache({ list, statusFilter });
      flash("ok", `Loaded ${list.length} collection${list.length === 1 ? "" : "s"}.`);
    } catch (e) {
      flash("err", `Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The initial load (or cache restore / post-operation refetch) is handled
    // by useDataInvalidation above. This effect only reacts to the user
    // explicitly changing the filter dropdown afterwards.
    if (skipNextFilterFetch.current) {
      skipNextFilterFetch.current = false;
      return;
    }
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openCollection(c) {
    try {
      sessionStorage.setItem(`tm_collection_${c.id}`, JSON.stringify(c));
    } catch {}
    router.push(`/collections/${c.id}`);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setMsg(null);
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) return flash("err", "Name is required to create a collection.");

    const payload = {
      name: form.name.trim(),
      status: Number(form.status),
      variant: form.variant,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.priority !== "" && form.priority !== null) payload.priority = Number(form.priority);
    if (form.image_url.trim()) payload.image_url = form.image_url.trim();
    if (form.actor.trim()) payload.created_by = form.actor.trim();
    const add = splitIds(form.add_product_ids);
    if (add.length) payload.add_product_ids = add;

    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setRawResponse(json.data);
      if (!json.ok) {
        if (json.status === 401) setAuthFailed(true);
        flash("err", `Create failed (${json.status}): ${json.data?.message || "see raw response"}`);
        return;
      }
      flash("ok", "Created successfully.");
      resetForm();
      setCreateOpen(false);
      await fetchCollections();
    } catch (e) {
      flash("err", `Network error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>
      <button style={{ ...btn("#f2f4f7", "#344054"), marginBottom: 16 }} onClick={() => router.push("/")}>
        ← Home
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Collections</h1>
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

      {/* List */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 240px" }}>
            <label style={label}>Status filter</label>
            <select style={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="COLLECTION_STATUS_ACTIVE">COLLECTION_STATUS_ACTIVE</option>
              <option value="COLLECTION_STATUS_INACTIVE">COLLECTION_STATUS_INACTIVE</option>
            </select>
          </div>
          <button
            style={{ ...btn("#f2f4f7", "#344054"), display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={fetchCollections}
            disabled={loading}
            title="Refresh collections"
          >
            <RefreshIcon /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {collections.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475467", borderBottom: "1px solid #eaecf0" }}>
                  <th style={{ padding: "8px 8px" }}>Priority</th>
                  <th style={{ padding: "8px 8px" }}>Name</th>
                  <th style={{ padding: "8px 8px" }}>Variant</th>
                  <th style={{ padding: "8px 8px" }}>Products</th>
                  <th style={{ padding: "8px 8px" }}>Status</th>
                  <th style={{ padding: "8px 8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {collections
                  .slice()
                  .sort((a, b) => (a.priority ?? a.display_order ?? 999) - (b.priority ?? b.display_order ?? 999))
                  .map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f2f4f7" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 600 }}>{c.priority ?? c.display_order ?? "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ color: "#98a2b3", fontSize: 11 }}>{c.id}</div>
                      </td>
                      <td style={{ padding: "10px 8px", color: "#667085" }}>
                        {(c.variant || c.type || "").replace("COLLECTION_VARIANT_", "").replace("COLLECTION_TYPE_", "")}
                      </td>
                      <td style={{ padding: "10px 8px" }}>{c.no_of_products ?? "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: c.status === "COLLECTION_STATUS_ACTIVE" ? "#ecfdf3" : "#f2f4f7",
                            color: c.status === "COLLECTION_STATUS_ACTIVE" ? "#067647" : "#667085",
                          }}
                        >
                          {(c.status || "").replace("COLLECTION_STATUS_", "")}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <button style={btn("#2563eb")} onClick={() => openCollection(c)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create section */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Create a new collection</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#667085" }}>Opens a form to set fields and add products.</p>
        </div>
        <button style={btn("#059669")} onClick={openCreate}>
          + Create collection
        </button>
      </div>

      {/* Create modal */}
      {createOpen && (
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
            overflowY: "auto",
          }}
          onClick={() => !submitting && setCreateOpen(false)}
        >
        <div
          style={{ ...card, maxWidth: 640, width: "100%", marginBottom: 0, maxHeight: "90vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Create collection</h2>
          <button
            onClick={() => setCreateOpen(false)}
            aria-label="Close"
            style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, color: "#98a2b3", cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={label}>Name *</label>
            <input style={input} value={form.name} onChange={set("name")} placeholder="Popular Packages" />
          </div>
          <div>
            <label style={label}>Priority (display order)</label>
            <input style={input} type="number" value={form.priority} onChange={set("priority")} placeholder="1" />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Description</label>
            <input style={input} value={form.description} onChange={set("description")} placeholder="Top diagnostic packages" />
          </div>

          <div>
            <label style={label}>Status</label>
            <select style={input} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Variant</label>
            <select style={input} value={form.variant} onChange={set("variant")}>
              {(VARIANTS.includes(form.variant) ? VARIANTS : [form.variant, ...VARIANTS]).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Image URL</label>
            <input style={input} value={form.image_url} onChange={set("image_url")} placeholder="https://example.com/image.png" />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Add product IDs</label>
            <textarea
              style={{ ...input, minHeight: 80, resize: "vertical" }}
              value={form.add_product_ids}
              onChange={set("add_product_ids")}
              placeholder="One per line or comma-separated"
            />
          </div>

          <div>
            <label style={label}>Created by</label>
            <input style={input} value={form.actor} onChange={set("actor")} placeholder="your name" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button style={btn("#059669")} onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Create collection"}
          </button>
          <button style={btn("#f2f4f7", "#344054")} onClick={resetForm}>
            Clear form
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
