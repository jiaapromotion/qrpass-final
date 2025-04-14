const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const nodemailer = require("nodemailer");
const axios = require("axios");

dotenv.config();
const app = express();
const port = process.env.PORT || 1000;

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Cashfree token globally
let cashfreeToken = null;
async function initializeCashfree() {
  try {
    const response = await axios.post(
      "https://api.cashfree.com/pg/v1/authenticate",
      {},
      {
        headers: {
          "x-client-id": process.env.CASHFREE_CLIENT_ID,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
        },
      }
    );
    cashfreeToken = response.data.data.token;
    console.log("✅ Cashfree token initialized");
  } catch (error) {
    console.error("❌ Failed to initialize Cashfree token:", error.message);
  }
}

// Google Sheet setup
async function pushToSheet(name, email, phone, quantity) {
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
  await doc.useServiceAccountAuth(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS));
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRow({ Name: name, Email: email, Phone: phone, Quantity: quantity });
}

// Email confirmation
async function sendEmail(to, name, quantity) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"QRPass" <${process.env.EMAIL_USER}>`,
    to,
    subject: "QRPass Ticket Confirmation",
    html: `<h3>Hi ${name},</h3><p>Your registration for ${quantity} ticket(s) is confirmed.</p>`,
  });
}

// Route to handle form submission and create order
app.post("/create-order", async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  try {
    // Push to Google Sheet
    await pushToSheet(name, email, phone, quantity);

    // Send confirmation email
    await sendEmail(email, name, quantity);

    // Create Cashfree order
    const orderRes = await axios.post(
      "https://api.cashfree.com/pg/orders",
      {
        order_id: "ORD" + Date.now(),
        order_amount: parseInt(quantity) * 199,
        order_currency: "INR",
        customer_details: {
          customer_id: Date.now().toString(),
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `https://qrpass-final.onrender.com/payment-success?order_id={order_id}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${cashfreeToken}`,
          "Content-Type": "application/json",
          "x-api-version": "2022-09-01",
        },
      }
    );

    const paymentLink = orderRes.data.data.payment_link;
    return res.json({ success: true, paymentLink });
  } catch (error) {
    console.error("❌ Order Creation Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Payment failed to initialize" });
  }
});

// Confirm server start
initializeCashfree().then(() => {
  app.listen(port, () => {
    console.log(`✅ QRPass Final Server is running on port ${port}`);
  });
});
