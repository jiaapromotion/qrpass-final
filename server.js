const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const PORT = process.env.PORT || 1000;

app.post('/register', async (req, res) => {
  const { name, email, phone, quantity } = req.body;

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
      subject: 'QRPass Ticket Registration (Test Mode)',
      text: `Hi ${name},\n\nThank you for registering. Please proceed to payment using the link below:\n\nhttps://rzp.io/rzp/sHMSjb1\n\nNote: This is a test mode payment.\n\n- QRPass Team`
    });

    // ✅ 2. Return Razorpay test link
    return res.json({
      success: true,
      message: "Registered and email sent",
      paymentLink: "https://rzp.io/rzp/sHMSjb1"
    });

  } catch (err) {
    console.error("💥 Razorpay Test Error:", err.message);
    return res.json({ success: false, message: "Error occurred." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
