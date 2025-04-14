const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("QRPass API is live.");
});

app.listen(process.env.PORT || 1000, () => {
  console.log("Server running on port 1000");
});
