// server.js
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
const GMAIL_USER = process.env.EMAIL_USER;
const GMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, phone, quantity } = req.body;
    const orderId = uuidv4();

    await doc.useServiceAccountAuth(SERVICE_ACCOUNT);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({ Name: name, Email: email, Phone: phone, Quantity: quantity, OrderID: orderId });

    const ticketData = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nQuantity: ${quantity}\nOrderID: ${orderId}`;
    const qrImage = await QRCode.toDataURL(ticketData);
    const htmlBody = `<h2>Thanks for registering</h2><p>${ticketData.replace(/\n/g, "<br>")}</p><img src='${qrImage}' width='200'/>`;

    await transporter.sendMail({ from: GMAIL_USER, to: email, subject: "QRPass Ticket", html: htmlBody });

    res.json({ success: true, message: "Registered and email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error occurred." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
