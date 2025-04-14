const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const fs = require('fs');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();
const port = process.env.PORT || 1000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

let cashfreeToken = null;

// ✅ Cashfree: Initialize Token from Production API
async function initializeCashfree() {
  try {
    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2022-09-01'
      },
      body: JSON.stringify({
        order_id: 'INIT_ORDER',
        order_amount: 1,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'init',
          customer_email: 'init@example.com',
          customer_phone: '0000000000'
        },
        order_meta: {
          return_url: 'https://qrpass-final.onrender.com/payment-success?order_id={order_id}'
        }
      })
    });

    const data = await response.json();
    if (response.ok && data.payment_session_id) {
      cashfreeToken = data.payment_session_id;
      console.log('✅ Cashfree initialized');
    } else {
      console.error('❌ Failed to initialize Cashfree token:', data);
    }
  } catch (err) {
    console.error('❌ Error initializing Cashfree:', err.message);
  }
}

// ✅ Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// ✅ Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ Register + Create Order
app.post('/register', async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  try {
    // 1. Create order on Cashfree
    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2022-09-01'
      },
      body: JSON.stringify({
        order_id: 'ORD' + Date.now(),
        order_amount: 99 * quantity,
        order_currency: 'INR',
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        order_meta: {
          return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`
        }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.payment_session_id) {
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    // 2. Save to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[name, email, phone, quantity]]
      }
    });

    // 3. Send confirmation email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'QRPass Confirmation',
      text: `Thank you ${name}, your registration is confirmed.`
    });

    res.json({ payment_session_id: data.payment_session_id });
  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ✅ Serve Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ✅ Start server after initializing Cashfree
initializeCashfree().then(() => {
  app.listen(port, () => {
    console.log('✅ QRPass Final Server is running...');
  });
});
