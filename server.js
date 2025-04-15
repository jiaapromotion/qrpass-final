const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 1000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Google Sheets Setup
const credentials = require('./credentials.json');
const spreadsheetId = '1ZnKm2cma8y9k6WMcT1YG3tqCjqq2VBILDEAaCBcyDtA';

async function appendToGoogleSheet(data) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  const resource = {
    values: [data],
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    resource,
  });
}

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Create Order with Cashfree
app.post('/create-order', async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  const amount = parseInt(quantity) * 50;

  const orderPayload = {
    order_amount: amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: `${Date.now()}`,
      customer_email: email,
      customer_phone: phone,
    },
    order_meta: {
      return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&quantity=${quantity}`,
    },
  };

  try {
    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
      body: JSON.stringify(orderPayload),
    });

    const result = await response.json();
    if (result.payment_link) {
      res.json({ success: true, payment_link: result.payment_link });
    } else {
      console.error('Cashfree Error:', result);
      res.status(500).json({ success: false, message: 'Cashfree API failed' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Payment Success Redirect
app.get('/payment-success', async (req, res) => {
  const { name, email, phone, quantity } = req.query;
  try {
    await appendToGoogleSheet([new Date().toLocaleString(), name, email, phone, quantity]);
    res.send(`<h2>Thank you ${name}, your registration is successful!</h2>`);
  } catch (error) {
    res.send(`<h2>Error saving to Google Sheet</h2>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
