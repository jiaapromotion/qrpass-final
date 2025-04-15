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
    const amount = Number(quantity) * 199; // in rupees

    const linkPayload = {
      customer_details: {
        customer_email: email,
        customer_phone: phone,
        customer_name: name
      },
      link_notify: {
        send_sms: true,
        send_email: true
      },
      link_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`
      },
      link_id: `LINK_${Date.now()}`,
      link_amount: amount,
      link_currency: 'INR'
    };

    console.log('📤 Sending to Cashfree /pg/v1/paymentLinks:', JSON.stringify(linkPayload));

    const response = await fetch('https://api.cashfree.com/pg/v1/paymentLinks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      },
      body: JSON.stringify(linkPayload)
    });

    const result = await response.json();
    console.log('📩 Cashfree Payment Link Response:', result);

    if (result?.data?.payment_link_url) {
      return res.json({ success: true, payment_link: result.data.payment_link_url });
    } else {
      return res.status(500).json({ success: false, details: result });
    }

  } catch (err) {
    console.error('❗ Server error:', err);
    res.status(500).json({ success: false, details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 QRPass Final Server running on port ${PORT}`);
});
