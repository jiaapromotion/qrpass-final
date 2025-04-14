const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html on base route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create Order Route
app.post('/create-order', async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  try {
    // Step 1: Authenticate to get token
    const tokenRes = await fetch('https://api.cashfree.com/pg/v1/authenticate', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      }
    });

    const tokenData = await tokenRes.json();

    if (!tokenData?.data?.token) {
      console.error('Auth failed:', tokenData);
      return res.status(500).json({ error: 'Auth failed', details: tokenData });
    }

    const token = tokenData.data.token;

    // Step 2: Create Order
    const orderId = `QRPASS_${Date.now()}`;
    const orderPayload = {
      order_id: orderId,
      order_amount: Number(quantity) * 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: phone,
        customer_name: name,
        customer_email: email,
        customer_phone: phone
      },
      order_meta: {
        return_url: 'https://qrpass.in/thank-you.html'
      }
    };

    const orderRes = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderRes.json();

    if (!orderData?.payment_link) {
      console.error('Payment link generation failed:', orderData);
      return res.status(500).json({ error: 'Payment link generation failed', details: orderData });
    }

    return res.json({ paymentLink: orderData.payment_link });

  } catch (err) {
    console.error('Internal Server Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
