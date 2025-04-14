require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const nodemailer = require("nodemailer");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 1000;

let CASHFREE_TOKEN = null;

// Correct Authentication Endpoint
async function initializeCashfree() {
  try {
    const res = await axios.post("https://api.cashfree.com/pg/authenticate", {}, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
      },
    });

    CASHFREE_TOKEN = res.data.data.token;
    console.log("✅ Cashfree token initialized");
  } catch (error) {
    console.error("❌ Failed to initialize Cashfree token:", error.message);
  }
}

app.post("/create-order", async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  const amount = 50 * Number(quantity);

  try {
    const orderRes = await axios.post(
      "https://api.cashfree.com/pg/orders",
      {
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CASHFREE_TOKEN}`,
          "Content-Type": "application/json",
          "x-api-version": "2022-09-01",
        },
      }
    );

    const paymentLink = orderRes.data.data.payment_link;
    res.json({ paymentLink });
  } catch (error) {
    console.error("Create order failed:", error.message);
    res.status(500).json({ error: "Order creation failed" });
  }
});

app.listen(PORT, async () => {
  await initializeCashfree();
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
