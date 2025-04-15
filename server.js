
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      }
    });

    const authData = await authResponse.json();
    const token = authData.data.token;

    // Create Order
    const orderResponse = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        order_meta: {
          notify_url: 'https://qrpass-final.onrender.com/webhook'
        },
        order_id: 'order_' + Date.now(),
        order_amount: amount / 100,
        order_currency: 'INR'
      })
    });

    const orderData = await orderResponse.json();

    if (orderData.payment_link) {
      res.json({ payment_link: orderData.payment_link });
    } else {
      console.error('Cashfree Order Error:', orderData);
      res.status(500).json({ error: 'Payment link generation failed.', details: orderData });
    }
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    res.status(500).json({ error: 'Something went wrong.', details: error.message });
  }
});

// Webhook to receive success payment callback
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`QRPass Final Server is running on port ${PORT}`);
});
