
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const SERVICE_ACCOUNT = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_KEY_BASE64, "base64").toString("utf8")
);

const doc = new GoogleSpreadsheet("1ZnKm2cma8y9k6WMcT1YG3tqCjqq2VBILDEAaCBcyDtA");

const GMAIL_USER = "info@qrpass.in";
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
});

app.post("/register", async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  const orderId = uuidv4();

  const paymentResponse = await fetch("https://sandbox.cashfree.com/pg/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2022-09-01",
      "x-client-id": process.env.CASHFREE_CLIENT_ID,
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET
    },
    body: JSON.stringify({
      customer_details: {
        customer_id: `cust_${phone}`,
        customer_email: email,
        customer_phone: phone,
        customer_name: name
      },
      order_id: orderId,
      order_amount: quantity * 199,
      order_currency: "INR",
      order_meta: {
        return_url: "https://qrpass.in/payment-success?order_id={order_id}"
      }
    })
  });

  const paymentData = await paymentResponse.json();

  if (paymentData.payment_session_id) {
    res.json({
      success: true,
      redirect: `https://payments.cashfree.com/pg/checkout?payment_session_id=${paymentData.payment_session_id}`
    });
  } else {
    res.status(400).json({ success: false, message: "Cashfree order failed", raw: paymentData });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 QRPass Server Live on port", PORT);
});
