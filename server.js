const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

const BASE_URL = "https://api.cashfree.com"; // Production
const TOKEN_URL = `${BASE_URL}/pg/services/v1/token`;
const ORDER_URL = `${BASE_URL}/pg/orders`;

app.get("/", (req, res) => {
  res.send("QRPass Final API is live!");
});

app.post("/create-order", async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;

    // Step 1: Get token
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CLIENT_ID,
        "x-client-secret": CLIENT_SECRET,
      },
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData || !tokenData.data || !tokenData.data.token) {
      console.error("Token response error:", tokenData);
      return res.status(500).json({ error: "Failed to get token" });
    }

    const token = tokenData.data.token;

    // Step 2: Create order
    const orderPayload = {
      customer_details: {
        customer_id: phone,
        customer_email: email,
        customer_phone: phone,
      },
      order_id: `QRPASS_${Date.now()}`,
      order_amount: 199 * Number(quantity),
      order_currency: "INR",
      order_note: `QRPass Ticket for ${name}`,
    };

    const orderResponse = await fetch(ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (!orderData || !orderData.payment_link) {
      console.error("Order response error:", orderData);
      return res.status(500).json({ error: "Failed to create order" });
    }

    res.status(200).json({ payment_link: orderData.payment_link });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
