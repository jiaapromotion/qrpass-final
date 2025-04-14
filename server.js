const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load env vars
const {
  CASHFREE_CLIENT_ID,
  CASHFREE_CLIENT_SECRET,
  PORT
} = process.env;

// Auth token variable
let cashfreeToken = null;

// Function to initialize Cashfree token
async function initializeCashfree() {
  try {
    const response = await axios.post(
      'https://api.cashfree.com/pg/v1/authenticate',
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CASHFREE_CLIENT_ID,
          'x-client-secret': CASHFREE_CLIENT_SECRET
        }
      }
    );
    cashfreeToken = response.data?.data?.token;
    console.log('✅ Cashfree token initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Cashfree token:', error.message);
  }
}

// API: Create Payment
app.post('/create-order', async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  if (!cashfreeToken) {
    return res.status(500).json({ error: 'Cashfree token not available' });
  }

  const orderId = 'ORD' + Date.now();
  const amount = quantity * 50;

  try {
    const result = await axios.post(
      'https://api.cashfree.com/pg/orders',
      {
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        order_meta: {
          return_url: `https://qrpass-final.onrender.com/payment-success?order_id=${orderId}`
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${cashfreeToken}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01'
        }
      }
    );

    return res.status(200).json({
      payment_link: result.data?.data?.payment_link
    });

  } catch (err) {
    console.error('❌ Error creating Cashfree order:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

// Server static index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start the app
initializeCashfree().then(() => {
  app.listen(PORT || 1000, () => {
    console.log(`✅ QRPass Final Server is running on port ${PORT || 1000}`);
  });
});
