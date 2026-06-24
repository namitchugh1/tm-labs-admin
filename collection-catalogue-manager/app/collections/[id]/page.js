"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { card, label, input, btn, splitIds } from "../../ui";
import { getEnv, envHeader, getToken, setToken as saveTokenForEnv } from "../../env";
import { markPageDirty } from "../../hooks/useDataInvalidation";

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

function inr(p) {
  const u = p?.selling_price?.units ?? p?.mrp?.units;
  return u ? `₹${Number(u).toLocaleString("en-IN")}` : "—";
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  // original (server) collection meta, and the editable form
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null); // { name, description, priority, status, variant, image_url, updated_by }

  const [products, setProducts] = useState([]);
  const [removeSet, setRemoveSet] = useState({}); // product_id -> true
  const [addIds, setAddIds] = useState("");

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [token, setToken] = useState("");
  const [authFailed, setAuthFailed] = useState(false);
  const [env, setEnvState] = useState("prod");

  const flash = (kind, text) => setMsg({ kind, text });

  function saveToken(v) {
    setToken(v);
    saveTokenForEnv(v, env);
  }

  function authHeader() {
    return { ...envHeader(), ...(token.trim() ? { "x-tm-token": token.trim() } : {}) };
  }

  // load selected collection meta (passed via sessionStorage from list)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const e = getEnv();
    setEnvState(e);
    const savedToken = getToken(e);
    if (savedToken) setToken(savedToken);

    let meta = null;
    try {
      const cached = sessionStorage.getItem(`tm_collection_${id}`);
      if (cached) meta = JSON.parse(cached);
    } catch {}

    if (meta) {
      seedFromMeta(meta);
      setLoadingMeta(false);
    } else {
      // fall back to refetching the list and finding this collection
      refetchMeta(savedToken);
    }
    // The bulk collections list doesn't return an exhaustive product list —
    // always follow up with the dedicated details call to get the full set.
    fetchCollectionDetails(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function seedFromMeta(c) {
    setOriginal(c);
    setForm({
      name: c.name || "",
      description: c.description || "",
      priority: c.priority ?? c.display_order ?? "",
      status: c.status === "COLLECTION_STATUS_INACTIVE" ? 2 : 1,
      variant: c.variant || "COLLECTION_VARIANT_PRODUCT_HOME",
      image_url: c.image_url || "",
      updated_by: "",
    });
    // Prod list embeds the members directly on the collection.
    if (Array.isArray(c.products)) {
      setProducts(c.products.map((p) => ({ product_summary: p })));
      setRemoveSet({});
    }
  }

  async function refetchMeta(tokenOverride) {
    setLoadingMeta(true);
    try {
      const tok = (tokenOverride ?? token).trim();
      const res = await fetch(`/api/collections?status=COLLECTION_STATUS_ACTIVE`, {
        headers: { ...envHeader(), ...(tok ? { "x-tm-token": tok } : {}) },
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.status === 401) setAuthFailed(true);
        return flash("err", `Fetch failed (${json.status}): ${json.data?.message || "see raw response"}`);
      }
      setAuthFailed(false);
      const list = Array.isArray(json.data?.data) ? json.data.data : [];
      const found = list.find((c) => c.id === id);
      if (found) seedFromMeta(found);
      else flash("err", "Collection not found in active list. It may be inactive — open it from the list page.");
    } catch (e) {
      flash("err", `Network error: ${e.message}`);
    } finally {
      setLoadingMeta(false);
    }
  }

  // The bulk /v1/collections list embeds products but isn't exhaustive —
  // this dedicated endpoint returns the full member list for one collection.
  async function fetchCollectionDetails(tokenOverride) {
    setLoadingProducts(true);
    try {
      const tok = (tokenOverride ?? token).trim();
      const res = await fetch(`/api/collections/details?collection_id=${encodeURIComponent(id)}`, {
        headers: { ...envHeader(), ...(tok ? { "x-tm-token": tok } : {}) },
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.status === 401) setAuthFailed(true);
        // Keep whatever products are already shown (from the cached/list
        // meta) rather than blanking the page if this call fails.
        return;
      }
      setAuthFailed(false);
      // Shape: { data: { details: { ...collection fields, products: [...] } } }
      const details = json.data?.data?.details ?? json.data?.details ?? json.data?.data ?? json.data ?? {};
      if (details.id) seedFromMeta(details); // authoritative meta — refines/corrects the cached list snapshot
      const list = Array.isArray(details.products) ? details.products : [];
      setProducts(list.map((p) => (p.product_summary ? p : { product_summary: p })));
      setRemoveSet({});
    } catch {
      // Network error: silently keep showing whatever was already loaded.
    } finally {
      setLoadingProducts(false);
    }
  }

  async function refreshProducts() {
    setLoadingProducts(true);
    setMsg(null);
    await refetchMeta();
    await fetchCollectionDetails();
    setLoadingProducts(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleRemove = (pid) => setRemoveSet((s) => ({ ...s, [pid]: !s[pid] }));

  // compute the diff that will be sent — `before` mirrors `changes` with the
  // prior value of each changed field, so the confirm modal can show "from → to".
  const diff = useMemo(() => {
    if (!form || !original) return null;
    const changes = {};
    const before = {};

    const origName = original.name || "";
    if (form.name.trim() !== origName) {
      changes.name = form.name.trim();
      before.name = origName;
    }
    const origDescription = original.description || "";
    if (form.description.trim() !== origDescription) {
      changes.description = form.description.trim();
      before.description = origDescription;
    }
    const origPriority = original.priority ?? original.display_order ?? "";
    if (String(form.priority) !== String(origPriority)) {
      changes.priority = Number(form.priority);
      before.priority = origPriority === "" ? "—" : origPriority;
    }
    const origStatus = original.status === "COLLECTION_STATUS_INACTIVE" ? 2 : 1;
    if (Number(form.status) !== origStatus) {
      changes.status = Number(form.status);
      before.status = origStatus === 2 ? "Inactive (2)" : "Active (1)";
    }
    const origVariant = original.variant || "";
    if (form.variant !== origVariant) {
      changes.variant = form.variant;
      before.variant = origVariant || "—";
    }
    const origImageUrl = original.image_url || "";
    if (form.image_url.trim() !== origImageUrl) {
      changes.image_url = form.image_url.trim();
      before.image_url = origImageUrl || "—";
    }

    const remove = Object.keys(removeSet).filter((k) => removeSet[k]);
    const add = splitIds(addIds);
    return { changes, before, add, remove, updated_by: form.updated_by.trim() };
  }, [form, original, removeSet, addIds]);

  const hasChanges = diff && (Object.keys(diff.changes).length > 0 || diff.add.length > 0 || diff.remove.length > 0);

  async function confirmUpdate() {
    if (!hasChanges) return;
    const payload = { collection_id: id, ...diff.changes };
    if (diff.add.length) payload.add_product_ids = diff.add;
    if (diff.remove.length) payload.remove_product_ids = diff.remove;
    if (diff.updated_by) payload.updated_by = diff.updated_by;

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
        setConfirmOpen(false);
        if (json.status === 401) setAuthFailed(true);
        return flash("err", `Update failed (${json.status}): ${json.data?.message || "see raw response"}`);
      }
      setConfirmOpen(false);
      flash("ok", "Collection updated successfully.");
      setAddIds("");
      setRemoveSet({});
      markPageDirty("collections");
      await refetchMeta();
      await fetchCollectionDetails(); // re-pull the exhaustive product list
    } catch (e) {
      setConfirmOpen(false);
      flash("err", `Network error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMeta) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 32 }}>
        <p>Loading collection…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px" }}>
      <button style={{ ...btn("#f2f4f7", "#344054"), marginBottom: 16 }} onClick={() => router.push("/collections")}>
        ← Back to collections
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>{original?.name || "Collection"}</h1>
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
      <p style={{ margin: "0 0 20px", color: "#667085", fontSize: 13 }}>
        <code>{id}</code>
      </p>

      {msg && (
        <div
          style={{
            ...card,
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

      {/* Editable collection fields */}
      {form && (
        <div style={card}>
          <h2 style={{ fontSize: 16, margin: "0 0 16px" }}>Collection fields</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={label}>Name</label>
              <input style={input} value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label style={label}>Priority (display order)</label>
              <input style={input} type="number" value={form.priority} onChange={set("priority")} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>Description</label>
              <input style={input} value={form.description} onChange={set("description")} />
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
              <input style={input} value={form.image_url} onChange={set("image_url")} />
            </div>
            <div>
              <label style={label}>Updated by</label>
              <input style={input} value={form.updated_by} onChange={set("updated_by")} placeholder="your name" />
            </div>
          </div>
        </div>
      )}

      {/* Products in collection */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, margin: 0, flex: 1 }}>
            Products in this collection{" "}
            <span style={{ color: "#98a2b3", fontWeight: 400 }}>({products.length})</span>
          </h2>
          <button style={btn("#f2f4f7", "#344054")} onClick={refreshProducts} disabled={loadingProducts}>
            {loadingProducts ? "Refreshing…" : "Refresh from server"}
          </button>
        </div>

        {products.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#475467", borderBottom: "1px solid #eaecf0" }}>
                <th style={{ padding: "8px 8px" }}>Product</th>
                <th style={{ padding: "8px 8px" }}>Type</th>
                <th style={{ padding: "8px 8px" }}>Tests</th>
                <th style={{ padding: "8px 8px" }}>Price</th>
                <th style={{ padding: "8px 8px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const s = p.product_summary || {};
                const marked = !!removeSet[s.product_id];
                const slash = { textDecoration: marked ? "line-through" : "none" };
                return (
                  <tr
                    key={s.product_id}
                    style={{ borderBottom: "1px solid #f2f4f7", background: marked ? "#fef3f2" : "transparent" }}
                  >
                    <td style={{ padding: "10px 8px", opacity: marked ? 0.55 : 1 }}>
                      <div style={{ fontWeight: 600, ...slash }}>{s.product_name}</div>
                      <div style={{ color: "#98a2b3", fontSize: 11, ...slash }}>{s.product_id}</div>
                    </td>
                    <td style={{ padding: "10px 8px", color: "#667085", opacity: marked ? 0.55 : 1, ...slash }}>
                      {(s.product_type || "").replace("PRODUCT_TYPE_", "")}
                    </td>
                    <td style={{ padding: "10px 8px", opacity: marked ? 0.55 : 1, ...slash }}>{s.no_of_tests ?? "—"}</td>
                    <td style={{ padding: "10px 8px", opacity: marked ? 0.55 : 1, ...slash }}>{inr(s.pricing)}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>
                      {marked ? (
                        <button
                          onClick={() => toggleRemove(s.product_id)}
                          title="Undo — keep this product"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "transparent",
                            border: "1px solid #d0d5dd",
                            borderRadius: 8,
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#344054",
                            cursor: "pointer",
                          }}
                        >
                          <UndoIcon /> Undo / keep
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleRemove(s.product_id)}
                          title="Remove this product from the collection"
                          aria-label="Remove product"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            border: "1px solid #fecdca",
                            borderRadius: 8,
                            padding: 7,
                            color: "#b42318",
                            cursor: "pointer",
                          }}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#98a2b3", fontSize: 13 }}>This collection has no products.</p>
        )}

        <div style={{ marginTop: 20 }}>
          <label style={label}>Add product IDs</label>
          <textarea
            style={{ ...input, minHeight: 70, resize: "vertical" }}
            value={addIds}
            onChange={(e) => setAddIds(e.target.value)}
            placeholder="One per line or comma-separated"
          />
        </div>
      </div>

      {/* Save bar */}
      <div style={{ ...card, position: "sticky", bottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, fontSize: 13, color: hasChanges ? "#344054" : "#98a2b3" }}>
          {hasChanges
            ? `Pending: ${Object.keys(diff.changes).length} field change(s), +${diff.add.length} / −${diff.remove.length} products`
            : "No pending changes"}
        </div>
        <button style={btn(hasChanges ? "#c2410c" : "#d0d5dd")} onClick={() => setConfirmOpen(true)} disabled={!hasChanges}>
          Review & update
        </button>
      </div>

      {/* Raw response */}
      {rawResponse && (
        <details style={card}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Raw API response</summary>
          <pre style={{ overflowX: "auto", fontSize: 12, background: "#0b1020", color: "#cdd6f4", padding: 16, borderRadius: 8, marginTop: 12 }}>
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </details>
      )}

      {/* Confirmation modal */}
      {confirmOpen && diff && (
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
          onClick={() => !submitting && setConfirmOpen(false)}
        >
          <div style={{ ...card, maxWidth: 520, width: "100%", marginBottom: 0 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Confirm update</h2>
            <p style={{ fontSize: 13, color: "#667085", margin: "0 0 16px" }}>
              One update call will be sent to <strong>{env}</strong> for collection <code>{id}</code>.
            </p>

            {Object.keys(diff.changes).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Field changes</div>
                {Object.entries(diff.changes).map(([k, v]) => {
                  const after = k === "status" ? (v === 2 ? "Inactive (2)" : "Active (1)") : String(v);
                  const before = diff.before[k];
                  return (
                    <div key={k} style={{ fontSize: 13, color: "#344054", marginBottom: 2 }}>
                      <code>{k}</code>:{" "}
                      <span style={{ color: "#98a2b3", textDecoration: "line-through" }}>{String(before)}</span>
                      {" → "}
                      <strong>{after}</strong>
                    </div>
                  );
                })}
              </div>
            )}
            {diff.add.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#067647" }}>Add {diff.add.length} product(s)</div>
                <div style={{ fontSize: 12, color: "#667085", wordBreak: "break-all" }}>{diff.add.join(", ")}</div>
              </div>
            )}
            {diff.remove.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#b42318" }}>Remove {diff.remove.length} product(s)</div>
                <div style={{ fontSize: 12, color: "#667085", wordBreak: "break-all" }}>{diff.remove.join(", ")}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button style={btn("#c2410c")} onClick={confirmUpdate} disabled={submitting}>
                {submitting ? "Updating…" : "Confirm & update"}
              </button>
              <button style={btn("#f2f4f7", "#344054")} onClick={() => setConfirmOpen(false)} disabled={submitting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
