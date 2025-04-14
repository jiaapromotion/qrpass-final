const fetch = require('node-fetch');

app.post("/create-order", async (req, res) => {
  const { name, email, phone, quantity } = req.body;

  try {
    const authHeaders = {
      "x-api-version": "2022-09-01",
      "x-client-id": process.env.CASHFREE_CLIENT_ID,
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
      "Content-Type": "application/json"
    };

    const orderPayload = {
      customer_details: {
        customer_id: email,
        customer_email: email,
        customer_phone: phone
      },
      order_id: "ORDER_" + Date.now(),
      order_amount: parseInt(quantity) * 199,
      order_currency: "INR",
      order_note: `QRPass for ${name}`
    };

    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (data.payment_link) {
      res.status(200).json({ payment_link: data.payment_link });
    } else {
      console.error("Failed to create Cashfree order:", data);
      res.status(500).json({ error: "Payment link generation failed", details: data });
    }
  } catch (err) {
    console.error("Error while creating Cashfree order:", err);
    res.status(500).json({ error: "Something went wrong", details: err });
  }
});
