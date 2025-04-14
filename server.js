const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const axios = require('axios');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const port = process.env.PORT || 1000;

// ===== Initialize Cashfree Token =====
let cashfreeToken = null;
async function initializeCashfree() {
  try {
    const response = await axios.post(
      'https://api.cashfree.com/pg/auth',
      {},
      {
        headers: {
          accept: 'application/json',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
          'x-api-version': '2022-09-01'
        }
      }
    );
    cashfreeToken = response.data?.data?.token;
    console.log('✅ Cashfree token initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Cashfree token:', err.message);
  }
}

// ===== Google Sheet Save =====
async function saveToSheet({ name, email, phone, quantity }) {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
  await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS));
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRow({ Name: name, Email: email, Phone: phone, Quantity: quantity });
}

// ===== Email Trigger =====
async function sendEmail(email, name) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  await transporter.sendMail({
    from: `"QRPass" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'QRPass Ticket Confirmation',
    html: `<p>Hi ${name},<br/>Thank you for registering. Your payment was successful.</p>`
  });
}

// ===== Create Payment Endpoint =====
app.post('/create-payment', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const orderId = `QR_${Date.now()}`;
    const amount = quantity * 199;

    if (!cashfreeToken) {
      return res.status(500).json({ error: 'Payment failed to initialize' });
    }

    const orderResponse = await axios.post(
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
          return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${cashfreeToken}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01'
        }
      }
    );

    const paymentLink = orderResponse.data.data.payment_link;

    // Save & Trigger only after success
    await saveToSheet({ name, email, phone, quantity });
    await sendEmail(email, name);

    res.json({ link: paymentLink });
  } catch (err) {
    console.error('❌ Payment error:', err.message);
    res.status(500).json({ error: 'Payment failed to initialize' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ===== Start Server =====
initializeCashfree().then(() => {
  app.listen(port, () => {
    console.log(`✅ QRPass Final Server is running on port ${port}`);
  });
});
