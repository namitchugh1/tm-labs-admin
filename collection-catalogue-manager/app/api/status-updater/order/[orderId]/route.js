// Staging-only proxy for the webhook status updater tool.
// Always hits stage-dev regardless of the app's global env toggle —
// this tool exists specifically to replicate Healthians staging webhooks.

const STAGE_BASE = "https://stage-dev.truemedsapi.in/DiagnosticsService/v1";

export async function GET(req, { params }) {
  const { orderId } = await params;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id") || "5620";

  try {
    const upstream = await fetch(
      `${STAGE_BASE}/order/details?order_id=${encodeURIComponent(orderId)}`,
      { headers: { "x-customer-id": customerId }, cache: "no-store" }
    );
    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
