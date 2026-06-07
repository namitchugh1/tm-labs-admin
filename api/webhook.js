const BASE_URL = 'https://stage-dev.truemedsapi.in/DiagnosticsService/v1';
const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY || 'skPFDnStINZsLB56C20pv7Bm';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const upstream = await fetch(`${BASE_URL}/diagnostics/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBHOOK_API_KEY,
      },
      body: JSON.stringify(req.body),
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
