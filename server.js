const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = Number(quantity) * 199 * 100;

    // ✅ Correct Cashfree Auth URL (Production)
   const authResponse = await fetch('https://api.cashfree.com/pg/orders/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-version': '2022-09-01',
    'x-client-id': process.env.CASHFREE_CLIENT_ID,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
  }
});


    const authData = await authResponse.json();

    if (!authData || !authData.data || !authData.data.token) {
      return res.status(500).json({ success: false, details: 'Auth token failed', debug: authData });
    }

    const token = authData.data.token;

    const orderPayload = {
  order_id: `ORD_${Date.now()}`,
  order_amount: amount / 100,
  order_currency: 'INR',
  customer_details: {
    customer_id: `ID_${Date.now()}`,
    customer_email: email,
    customer_phone: phone
  },
  order_meta: {
    return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`
  }
};


    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();

    if (result.payment_link) {
      res.json({ success: true, payment_link: result.payment_link });
    } else {
      res.status(500).json({ success: false, details: result });
    }

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`QRPass Final Server is running on port ${PORT}`);
});
