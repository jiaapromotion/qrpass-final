const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const PORT = process.env.PORT || 1000;

app.post('/register', async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  try {
    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'QRPass Ticket Confirmation',
      text: `Thanks ${name}, your registration is confirmed.`
    });

    // Cashfree Payment Session
    const response = await axios.post(
      'https://sandbox.cashfree.com/pg/orders',
      {
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        order_amount: Number(quantity) * 99,
        order_currency: 'INR'
      },
      {
        headers: {
          accept: 'application/json',
          'x-api-version': '2022-09-01',
          'content-type': 'application/json',
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
        }
      }
    );

    const sessionId = response.data.payment_session_id;

    return res.json({
      success: true,
      message: 'Registered and email sent',
      paymentSessionId: sessionId
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Error occurred.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
