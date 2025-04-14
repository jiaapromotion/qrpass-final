const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 1000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let cashfreeToken = null;

async function initializeCashfree() {
  try {
    const authResponse = await fetch('https://api.cashfree.com/pg/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      },
      body: JSON.stringify({
        grant_type: 'client_credentials'
      })
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      console.error("Failed to initialize Cashfree token:", authData);
      return;
    }

    cashfreeToken = authData.access_token;
    console.log("✅ Cashfree token initialized successfully");

  } catch (err) {
    console.error("❌ Error initializing Cashfree token:", err);
  }
}

app.get("/", (req, res) => {
  res.send("QRPass Final API is live!");
});

app.post("/create-order", async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  const orderId = "ORD" + Date.now();
  const amount = 50 * parseInt(quantity || 1);

  try {
    const orderResponse = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cashfreeToken}`
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        order_meta: {
          return_url: `https://qrpass-final.onrender.com/payment-success?order_id=${orderId}`
        }
      })
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("❌ Failed to create Cashfree order:", orderData);
      return res.status(500).json({ error: "Order creation failed" });
    }

    res.json({ payment_link: orderData.payment_link });

  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  initializeCashfree(); // ✅ Initialize token before requests
  console.log(`✅ QRPass Final Server is running on port ${port}`);
});
