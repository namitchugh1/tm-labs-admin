// Proxy for listing the full product catalog (no collection filter).
// Upstream: GET /v1/products?pincode=&page=&limit=&filter.labPartner=

import { getBase, authHeaders } from "../../../lib/upstream";

const DEFAULT_PINCODE = "122001";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") || DEFAULT_PINCODE;
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "5000";
  const labPartner = searchParams.get("labPartner") || "LAB_PARTNER_HEALTHIANS";

  const qs = new URLSearchParams({
    pincode,
    page,
    limit,
    "filter.labPartner": labPartner,
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
