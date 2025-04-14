const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("QRPass Final API is live!");
});

app.post("/create-order", async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = quantity * 50;

    // STEP 1: Authenticate with Cashfree using production endpoint
    const authResponse = await fetch("https://api.cashfree.com/pg/orders/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET
      }
    });

    const authData = await authResponse.json();

    if (!authData?.data?.token) {
      console.error("Auth Error:", authData);
      return res.status(500).json({ error: "Authentication with Cashfree failed" });
    }

    const token = authData.data.token;

    // STEP 2: Create an order
    const orderPayload = {
      order_id: `ORD${Date.now()}`,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: `${Date.now()}`,
        customer_email: email,
        customer_phone: phone
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?order_id={order_id}`
      }
    };

    const orderResponse = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderResponse.json();

    if (!orderData?.data?.payment_link) {
      console.error("Order Creation Failed:", orderData);
      return res.status(500).json({ error: "Failed to create Cashfree order" });
    }

    // Send payment link to frontend
    res.json({ paymentLink: orderData.data.payment_link });

  } catch (error) {
    console.error("Unexpected Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`✅ QRPass Final Server is running on port ${PORT}`);
});
