// Staging-only proxy that fires a simulated Healthians webhook event.
// Always hits stage-dev — never wire this to a prod base URL.

const STAGE_BASE = "https://stage-dev.truemedsapi.in/DiagnosticsService/v1";
const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY || "skPFDnStINZsLB56C20pv7Bm";

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${STAGE_BASE}/diagnostics/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WEBHOOK_API_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return Response.json(data, { status: upstream.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
