const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = Number(quantity) * 199 * 100; // In paise

    console.log('👉 Received request:', { name, email, phone, quantity });

    // ✅ Correct Auth endpoint for Payment Links
    console.log('👉 Hitting Cashfree Payment Link Auth endpoint...');
    const authResponse = await fetch('https://api.cashfree.com/pg/links/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      }
    });

    const authData = await authResponse.json();
    console.log('🔐 Auth response:', authData);

    if (!authData || !authData.data || !authData.data.token) {
      console.log('❌ Auth token missing or invalid');
      return res.status(500).json({ success: false, details: 'Auth token failed', debug: authData });
    }

    const token = authData.data.token;
    console.log('✅ Auth token received:', token.slice(0, 10) + '...');

    // ✅ Generate Payment Link
    const linkPayload = {
      customer_details: {
        customer_id: `ID_${Date.now()}`,
        customer_email: email,
        customer_phone: phone
      },
      link_notify: {
        send_sms: true,
        send_email: true
      },
      link_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`,
        notify_url: ''
      },
      link_id: `LINK_${Date.now()}`,
      link_amount: amount / 100,
      link_currency: 'INR'
    };

    console.log('📤 Sending to Cashfree /pg/links:', JSON.stringify(linkPayload));

    const response = await fetch('https://api.cashfree.com/pg/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(linkPayload)
    });

    const result = await response.json();
    console.log('📩 Cashfree Response:', result);

    if (result.link_url) {
      return res.json({ success: true, payment_link: result.link_url });
    } else {
      return res.status(500).json({ success: false, details: result });
    }

  } catch (err) {
    console.error('❗ Server error:', err);
    res.status(500).json({ success: false, details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 QRPass Final Server is running on port ${PORT}`);
});
