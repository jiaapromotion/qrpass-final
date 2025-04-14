const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

const {
  EMAIL_USER,
  EMAIL_PASS,
  AISENSY_API_KEY,
  SPREADSHEET_ID,
  GOOGLE_APPLICATION_CREDENTIALS,
  CASHFREE_CLIENT_ID,
  CASHFREE_CLIENT_SECRET,
} = process.env;

const credentials = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS);

// Google Sheets Setup
const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
async function addToSheet({ name, email, phone, quantity }) {
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRow({ Name: name, Email: email, Phone: phone, Quantity: quantity, Time: new Date().toLocaleString() });
}

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

async function sendEmail(to, subject, text) {
  await transporter.sendMail({ from: EMAIL_USER, to, subject, text });
}

// WhatsApp via AiSensy
async function sendWhatsApp(phone, message) {
  await fetch('https://backend.aisensy.com/campaign/t1/api/v2/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AISENSY_API_KEY}`,
    },
    body: JSON.stringify({
      phone: phone,
      message: message,
    }),
  });
}

// Register Payment Endpoint
app.post('/create-payment', async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  const amount = parseInt(quantity) * 50;

  const order_id = 'ORD' + Date.now();
  const result = await fetch('https://api.cashfree.com/pg/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2022-09-01',
      'x-client-id': CASHFREE_CLIENT_ID,
      'x-client-secret': CASHFREE_CLIENT_SECRET,
    },
    body: JSON.stringify({
      order_id,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: phone,
        customer_email: email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&quantity=${quantity}`,
      },
    }),
  });

  const data = await result.json();
  if (data.payment_link) {
    res.json({ payment_url: data.payment_link });
  } else {
    res.json({ message: 'Payment failed to initialize' });
  }
});

// Payment Success Redirect Handler
app.get('/payment-success', async (req, res) => {
  const { name, email, phone, quantity } = req.query;

  await addToSheet({ name, email, phone, quantity });
  await sendEmail(email, 'QRPass Ticket Confirmation', `Dear ${name},\n\nThanks for registering. Your ${quantity} ticket(s) are confirmed.`);
  await sendWhatsApp(phone, `Hi ${name}, your QRPass registration is confirmed for ${quantity} ticket(s). See you at the event!`);

  res.send('<h2>✅ Registration successful after payment.</h2>');
});

// Home Route
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// Start Server
app.listen(process.env.PORT || 1000, () => console.log('✅ QRPass Final Server is running...'));
