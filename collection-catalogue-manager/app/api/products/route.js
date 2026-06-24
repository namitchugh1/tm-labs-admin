// Proxy for listing products inside a collection.
// Upstream: GET /v1/products?pincode=&page=&limit=&filter.labPartner=&filter.collection_id=
// (product membership is serviceability-filtered by pincode upstream).

import { getBase, authHeaders } from "../../lib/upstream";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") || "122001";
  const collectionId = searchParams.get("collection_id") || "";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "100";
  const labPartner = searchParams.get("labPartner") || "LAB_PARTNER_HEALTHIANS";

  if (!collectionId)
    return Response.json({ ok: false, status: 400, data: { message: "collection_id is required" } });

  const qs = new URLSearchParams({
    pincode,
    page,
    limit,
    "filter.labPartner": labPartner,
    "filter.collection_id": collectionId,
  });
  const url = `${getBase(req)}/v1/products?${qs.toString()}`;

  try {
    const res = await fetch(url, { headers: authHeaders(req), cache: "no-store" });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    return Response.json({ ok: res.ok, status: res.status, data: body });
  } catch (e) {
    return Response.json({ ok: false, status: 502, data: { message: `Upstream error: ${e.message}` } });
  }
}
