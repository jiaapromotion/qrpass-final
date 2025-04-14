const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 1000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let cashfreeToken = null;

// ✅ Initialize Cashfree Token
async function initializeCashfree() {
  try {
    const response = await axios.post(
      'https://api.cashfree.com/pg/oauth/token',
      {
        client_id: process.env.CASHFREE_CLIENT_ID,
        client_secret: process.env.CASHFREE_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    cashfreeToken = response.data.access_token;
    console.log('✅ Cashfree token initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Cashfree token:', error.message);
  }
}

// ✅ API to Create Order
app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const orderAmount = 199 * Number(quantity);
    const orderId = `ORD${Date.now()}`;

    const payload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: phone,
        customer_email: email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?order_id=${orderId}`,
      },
    };

    const response = await axios.post(
      'https://api.cashfree.com/pg/orders',
      payload,
      {
        headers: {
          Authorization: `Bearer ${cashfreeToken}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        },
      }
    );

    return res.json({ payment_link: response.data.payment_link });
  } catch (error) {
    console.error('❌ Error creating Cashfree order:', error.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

// ✅ Serve front page
app.get('/', (req, res) => {
  res.send(`<h2>QRPass Final API is live!</h2>`);
});

// ✅ Start Server
app.listen(port, async () => {
  await initializeCashfree();
  console.log(`✅ QRPass Final Server is running on port ${port}`);
});
