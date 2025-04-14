const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 1000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('QRPass Final API is live!');
});

// ✅ Correct Cashfree Token URL
const TOKEN_URL = 'https://api.cashfree.com/pg/services/v1/token';
// ✅ Correct Cashfree Order URL
const ORDER_URL = 'https://api.cashfree.com/pg/orders';

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;

    // Step 1: Get Token
    const authResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
    });

    const authData = await authResponse.json();

    if (!authData || !authData.data || !authData.data.token) {
      console.error('Auth failed:', authData);
      return res.status(500).json({ error: 'Authentication failed', details: authData });
    }

    const token = authData.data.token;

    // Step 2: Create Order
    const orderId = 'ORD' + Date.now();
    const orderAmount = 199 * quantity;

    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: phone,
        customer_email: email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}&order_id=${orderId}`,
      },
    };

    const orderResponse = await fetch(ORDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (orderData && orderData.payment_link) {
      res.json({ payment_link: orderData.payment_link });
    } else {
      console.error('Order creation failed:', orderData);
      res.status(500).json({ error: 'Order creation failed', details: orderData });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`✅ QRPass Final Server is running on port ${port}`);
});
