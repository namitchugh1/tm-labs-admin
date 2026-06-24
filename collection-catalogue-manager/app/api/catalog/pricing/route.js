// Proxy for updating a product's MRP / selling price.
// Upstream: PUT /v1/catalog/product/pricing/update
// Base URL (stage/prod) and auth (fixed x-api-key, or x-tm-token override)
// come from ../../../lib/upstream, same as the other proxy routes.

import { getBase, authHeaders } from "../../../lib/upstream";

export async function PUT(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false, status: 400, data: { message: "Invalid JSON body" } });
  }

  try {
    const res = await fetch(`${getBase(req)}/v1/catalog/product/pricing/update`, {
      method: "PUT",
      headers: authHeaders(req),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
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
