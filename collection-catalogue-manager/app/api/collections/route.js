// Server-side proxy to the Truemeds DiagnosticsService.
// Runs on Vercel's server, so the browser never calls the prod API directly
// (avoids CORS). Base URL (stage/prod) and auth come from ../../lib/upstream.

import { getBase, authHeaders } from "../../lib/upstream";

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
    { status: 200 } // always 200 to the client; real status is in the payload
  );
}

// GET /api/collections?status=COLLECTION_STATUS_ACTIVE  -> list collections
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "COLLECTION_STATUS_ACTIVE";
  const url = `${getBase(req)}/v1/collections?status=${encodeURIComponent(status)}`;

  try {
    const res = await fetch(url, { headers: authHeaders(req), cache: "no-store" });
    return forward(res);
  } catch (e) {
    return Response.json({ ok: false, status: 502, data: { message: `Upstream error: ${e.message}` } });
  }
}

// POST /api/collections  -> create OR update (presence of collection_id = update)
export async function POST(req) {
  const headers = authHeaders(req);
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false, status: 400, data: { message: "Invalid JSON body" } });
  }

  try {
    const res = await fetch(`${getBase(req)}/v1/local/diagnostics/collections`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return forward(res);
  } catch (e) {
    return Response.json({ ok: false, status: 502, data: { message: `Upstream error: ${e.message}` } });
  }
}
