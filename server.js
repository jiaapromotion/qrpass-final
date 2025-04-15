
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 1000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = Number(quantity) * 199 * 100;

    // Get Cashfree Auth Token
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

    if (!token) {
      console.error('Cashfree token error:', authData);
      return res.status(500).json({ success: false, message: 'Cashfree token failed' });
    }

    // Create Cashfree Order
    const orderPayload = {
      order_id: 'ORDER_' + Date.now(),
      order_amount: amount / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: Date.now().toString(),
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
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();

    if (result.payment_link) {
      res.json({ success: true, payment_link: result.payment_link });
    } else {
      console.error('Cashfree API Error:', result);
      res.status(500).json({ success: false, message: 'Cashfree API failed' });
    }
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
