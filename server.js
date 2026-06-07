const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const BASE_URL = 'https://stage-dev.truemedsapi.in/DiagnosticsService/v1';
const WEBHOOK_API_KEY = 'skPFDnStINZsLB56C20pv7Bm';

app.get('/api/order/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const customerId = req.query.customer_id || '5620';
  try {
    const response = await fetch(
      `${BASE_URL}/order/details?order_id=${encodeURIComponent(orderId)}`,
      { headers: { 'x-customer-id': customerId } }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhook', async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/diagnostics/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBHOOK_API_KEY,
      },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Webhook Tester running at http://localhost:${PORT}`);
});
