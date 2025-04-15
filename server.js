const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = Number(quantity) * 199 * 100;

    // Get Auth Token
    const authResponse = await fetch('https://api.cashfree.com/pg/v1/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      }
    });

    const authData = await authResponse.json();
    if (!authData.token) {
      console.error('Auth Error:', JSON.stringify(authData, null, 2));
      return res.status(500).json({
        success: false,
        message: 'Auth token fetch failed',
        details: authData,
        env_client_id: process.env.CASHFREE_CLIENT_ID ? 'Present' : 'Missing',
        env_client_secret: process.env.CASHFREE_CLIENT_SECRET ? 'Present' : 'Missing'
      });
    }

    const orderPayload = {
      order_id: `order_${Date.now()}`,
      order_amount: amount / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: `${Date.now()}`,
        customer_email: email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`
      }
    };

    // Create order
    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();
    if (result.payment_link) {
      res.json({ success: true, payment_link: result.payment_link });
    } else {
      console.error("Cashfree Response Error:", JSON.stringify(result, null, 2));
      res.status(500).json({
        success: false,
        message: 'Cashfree API failed',
        details: result,
        env_client_id: process.env.CASHFREE_CLIENT_ID ? 'Present' : 'Missing',
        env_client_secret: process.env.CASHFREE_CLIENT_SECRET ? 'Present' : 'Missing'
      });
    }
  } catch (err) {
    console.error("Unexpected Error:", err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`QRPass Final Server is running on port ${PORT}`);
});
