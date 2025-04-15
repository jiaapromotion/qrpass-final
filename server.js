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

    // Step 1: Get Auth Token from Cashfree
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

    // Step 2: Create Payment Link (not order!)
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

    if (result.link_url) {
      res.json({ success: true, payment_link: result.link_url });
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
