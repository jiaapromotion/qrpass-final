const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
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
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
    });

    const authData = await authResponse.json();

    if (!authData || !authData.data || !authData.data.token) {
      console.error('❌ Auth Token Failed:', authData);
      return res.status(500).json({ success: false, details: 'Auth token failed' });
    }

    const token = authData.data.token;

    // Create Order
    const orderPayload = {
      order_id: 'ORDER-' + Date.now(),
      order_amount: amount / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: phone,
        customer_email: email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`,
      },
    };

    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const result = await response.json();

    if (result && result.payment_link) {
      res.json({ success: true, payment_link: result.payment_link });
    } else {
      const errorText = await response.text();
      console.error('🔴 Cashfree API Failure:\n', errorText);
      res.status(500).json({ success: false, details: errorText });
    }

  } catch (err) {
    console.error('⚠️ Server Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
