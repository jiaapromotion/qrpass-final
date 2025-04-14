const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

app.post("/register", async (req, res) => {
  const { name, email, phone, quantity } = req.body;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[new Date().toLocaleString(), name, email, phone, quantity]],
      },
    });
    res.send("Registered successfully!");
  } catch (err) {
    console.error("Registration failed:", err.message);
    res.status(500).send("Something went wrong");
  }
});

app.get("/", (req, res) => {
  res.send("QRPass API is live.");
});

app.listen(1000, () => console.log("Server running on port 1000"));
