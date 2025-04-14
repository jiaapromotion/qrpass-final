const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 1000;

let cashfreeToken = '';
let tokenExpiryTime = 0;

// ✅ Initialize Cashfree Token
async function initializeCashfree() {
  try {
    const now = Date.now();
    if (cashfreeToken && now < tokenExpiryTime) return;

    const authResponse = await fetch('https://api.cashfree.com/pg/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
      body: 'grant_type=client_credentials'
    });

    const data = await authResponse.json();
    if (!data.access_token) throw new Error(JSON.stringify(data));

    cashfreeToken = data.access_token;
    tokenExpiryTime = now + data.expires_in * 1000;
    console.log('✅ Cashfree token initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Cashfree token:', err.message);
  }
}

// ✅ Create Order API
app.post('/create-order', async (req, res) => {
  try {
    await initializeCashfree();

    const { name, email, phone, quantity } = req.body;
    const amount = Number(quantity) * 199;

    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashfreeToken}`,
      },
      body: JSON.stringify({
        order_id: 'ORD' + Date.now(),
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`,
        },
      }),
    });

    const result = await response.json();

    if (!result.payment_link) {
      console.error('❌ Order creation failed:', result);
      return res.status(500).json({ error: 'Cashfree order creation failed' });
    }

    res.json({ paymentLink: result.payment_link });
  } catch (err) {
    console.error('❌ Server error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ✅ Root Status
app.get('/', (req, res) => {
  res.send('QRPass Final API is live!');
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
  initializeCashfree();
});
