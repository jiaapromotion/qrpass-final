const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 1000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve index.html
app.use(express.static(path.join(__dirname, 'public')));

app.post('/create-order', async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const amount = Number(quantity) * 199 * 100;

    const orderPayload = {
      order_amount: amount / 100,
      order_currency: "INR",
      customer_details: {
        customer_id: `${Date.now()}`,
        customer_email: email,
        customer_phone: phone
      },
      order_meta: {
        return_url: `https://qrpass-final.onrender.com/payment-success?name=${encodeURIComponent(name)}`
      }
    };

    const response = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET
      },
      body: JSON.stringify(orderPayload)
    });

    const result = await response.json();

    if (result.payment_link) {
      res.json({ success: true, payment_link: result.payment_link });
    } else {
      console.error("Cashfree Error:", result);
      res.status(500).json({ success: false, message: 'Cashfree API failed', details: result });
    }

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`QRPass Final Server is running on port ${PORT}`);
});
