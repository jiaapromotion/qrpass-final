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
  const amount = Number(quantity) * 99;

  try {
    // ✅ 1. Send Email Confirmation
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
      subject: 'QRPass Ticket Registration',
      text: `Hi ${name},\n\nThank you for registering. You'll now be redirected to a secure payment link to confirm your ticket.\n\n- QRPass Team`
    });

    // ✅ 2. Create Cashfree Payment Link (Live)
    const response = await axios.post(
      'https://api.cashfree.com/pg/links',
      {
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        link_id: "QR" + Date.now(),
        link_amount: amount,
        link_currency: "INR",
        link_purpose: "Event Ticket Purchase",
        link_notify: {
          send_sms: true,
          send_email: true
        },
        link_meta: {
          return_url: "https://qrpass.in/payment-success"
        }
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

    const paymentLink = response.data.link_url;

    return res.json({
      success: true,
      message: "Registered and email sent",
      paymentLink
    });

  } catch (err) {
    console.error("💥 ERROR:", err.response?.data || err.message);
    return res.json({ success: false, message: "Error occurred." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
