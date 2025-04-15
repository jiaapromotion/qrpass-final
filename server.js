const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const orderAmount = Number(quantity) * 199;

    const orderPayload = {
      order_id: `ORDER_${Date.now()}`,
      order_amount: orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: `CUST_${Date.now()}`,
        customer_name: name,
        customer_email: email,
        customer_phone: phone
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?order_id={order_id}`
      }
    };

    console.log('📤 Creating order via /pg/orders:', JSON.stringify(orderPayload));

    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();
    console.log('📩 Cashfree Order Response:', result);

    if (result && result.data && result.data.payment_session_id) {
      const redirectUrl = `https://payments.cashfree.com/pg/orders/${result.data.order_id}`;
      return res.json({ success: true, redirect_url: redirectUrl });
    } else {
      return res.status(500).json({ success: false, details: result });
    }

  } catch (err) {
    console.error('❗ Server error:', err);
    res.status(500).json({ success: false, details: err.message });
  }
});

// 🔥 Fix for root route blank screen
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 QRPass Redirect Server running on port ${PORT}`);
});
