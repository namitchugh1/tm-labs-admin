// Server-side proxy for the per-collection details endpoint.
// The bulk /v1/collections list doesn't return an exhaustive product list
// for each collection — use this endpoint when opening a single collection
// to get its full member list.

import { getBase, authHeaders } from "../../../lib/upstream";

async function forward(upstreamRes) {
  const text = await upstreamRes.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return Response.json(
    { ok: upstreamRes.ok, status: upstreamRes.status, data: body },
    { status: 200 }
  );
}

// GET /api/collections/details?collection_id=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collection_id");
  if (!collectionId) {
    return Response.json({ ok: false, status: 400, data: { message: "collection_id is required" } });
  }

  const url = `${getBase(req)}/v1/collection/details?collection_id=${encodeURIComponent(collectionId)}`;

  try {
    const res = await fetch(url, { headers: authHeaders(req), cache: "no-store" });
    return forward(res);
  } catch (e) {
    return Response.json({ ok: false, status: 502, data: { message: `Upstream error: ${e.message}` } });
  }
}
