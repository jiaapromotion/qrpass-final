const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize Cashfree
let cashfreeToken = '';
const initializeCashfree = async () => {
  try {
    const response = await axios.post(
      'https://api.cashfree.com/pg/v1/token',
      {
        grant_type: 'client_credentials',
        client_id: process.env.CASHFREE_CLIENT_ID,
        client_secret: process.env.CASHFREE_CLIENT_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    cashfreeToken = response.data.data.token;
    console.log('✅ Cashfree token initialized.');
  } catch (error) {
    console.error('❌ Failed to initialize Cashfree token:', error.message);
  }
};

// Spreadsheet Setup
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
const serviceAccountAuth = new google.auth.JWT({
  email: process.env.EMAIL_USER,
  key: process.env.GOOGLE_APPLICATION_CREDENTIALS.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const addToSheet = async (data) => {
  await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS));
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRow(data);
};

// Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// WhatsApp via AiSensy
const sendWhatsApp = async (name, phone) => {
  try {
    await axios.post(
      'https://backend.aisensy.com/campaign/t1/api/v2/message',
      {
        campaignName: 'QRPass Registration',
        destination: `91${phone}`,
        user: {
          name: name,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AISENSY_API_KEY}`,
        },
      }
    );
    console.log('📲 WhatsApp message sent');
  } catch (err) {
    console.error('WhatsApp error:', err.message);
  }
};

// Register Route
app.post('/register', async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  const amount = parseInt(quantity) * 50;

  try {
    const orderRes = await axios.post(
      'https://api.cashfree.com/pg/orders',
      {
        order_id: `ORD_${Date.now()}`,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: 'https://qrpass.in/success',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${cashfreeToken}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        },
      }
    );

    const paymentLink = orderRes.data.data.payment_link;

    res.json({ success: true, link: paymentLink });
  } catch (err) {
    console.error('Cashfree Order Error:', err.response?.data || err.message);
    res.json({ success: false });
  }
});

// Confirm Route (called after payment is done)
app.post('/confirm', async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  try {
    await addToSheet({ Name: name, Email: email, Phone: phone, Quantity: quantity });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'QRPass Registration Confirmation',
      text: `Hello ${name},\n\nYour QRPass registration is confirmed.\n\nThank you!`,
    });

    await sendWhatsApp(name, phone);

    res.json({ success: true });
  } catch (err) {
    console.error('Confirmation error:', err.message);
    res.json({ success: false });
  }
});

// Root
app.get('/', (req, res) => {
  res.send('<h1>QRPass Registration</h1>');
});

// Start server after initializing Cashfree
initializeCashfree(); // 👈 required before server starts

app.listen(process.env.PORT || 1000, () => {
  console.log('✅ QRPass Final Server is running...');
});
