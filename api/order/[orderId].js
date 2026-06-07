const BASE_URL = 'https://stage-dev.truemedsapi.in/DiagnosticsService/v1';

module.exports = async (req, res) => {
  const { orderId, customer_id } = req.query;
  const customerId = customer_id || '5620';
  try {
    const upstream = await fetch(
      `${BASE_URL}/order/details?order_id=${encodeURIComponent(orderId)}`,
      { headers: { 'x-customer-id': customerId } }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
