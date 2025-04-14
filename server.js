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

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = parseInt(quantity) * 19900;

    // Step 1: Authenticate to get access token
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
      console.error('Auth failed:', authData);
      return res.status(500).json({ error: 'Auth failed', details: authData });
    }

    const token = authData.data.token;

    // Step 2: Create order
    const orderResponse = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-version': '2022-09-01'
      },
      body: JSON.stringify({
        order_amount: amount / 100,
        order_currency: 'INR',
        customer_details: {
          customer_id: Date.now().toString(),
          customer_email: email,
          customer_phone: phone,
          customer_name: name
        }
      })
    });

    const orderData = await orderResponse.json();
    if (!orderData || !orderData.payment_link) {
      console.error('Order creation failed:', orderData);
      return res.status(500).json({ error: 'Order creation failed', details: orderData });
    }

    res.json({ payment_link: orderData.payment_link });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
