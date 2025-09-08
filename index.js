import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { google } from "googleapis";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = 8000;
dotenv.config({ debug: true });

//starting the server with the middleware in the json format
app.use(express.json());

//enabling cors from everywqhere first - MIDDLEWARRE FOR CORS
app.use(
  cors({
    origin: "*",
    methods: ["POST"],
  })
);

//MIDDLEWARE FOR RATE LIMITATION
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 10 minutes
  max: 5, // max 5 requests
  message: { success: false, error: "Too many requests. Try again later." },
});
app.use("/sendEmail", limiter);

//making the client config content that can be used
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SEC = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

//settting yup google oauth 2 - ill have to pass the client credentials
const authClient = new google.auth.OAuth2(CLIENT_ID, CLIENT_SEC, REDIRECT_URI);

//seting the refreshtoken credentials with the auth client
authClient.setCredentials({ refresh_token: REFRESH_TOKEN });

//creating the post endpoint to send the email
app.post("/sendEmail", async (req, res) => {
  try {
    //req body - destructuring
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message)
      return res.status(400).json({
        message: "please fill all the required fields",
      });

    //getting the access token - wioth the help of the auth client getaccesstoken method
    const accessToken = (await authClient.getAccessToken())?.token;
    // console.log(accessToken);
    // console.log(accessToken.token);

    //create nodemailer transport with the help of createTransport and sending mail\
    const emailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.USER_EMAIL_ID,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SEC,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken?.token,
      },
    });

    //CREATING THE MAIL OPTIONs
    const mailOptions = {
      from: `portfolio mail <${process.env.USER_EMAIL_ID}>`,
      to: process.env.USER_EMAIL_ID,
      subject: subject || `Message from ${name}`,
      text: `You have received a new message from your portfolio contact form.\n\nName: ${name}\n\nEmail: ${email}\n\nMessage:\n${message}`,
    };

    //creating a promise to send email
    const result = await emailTransporter.sendMail(mailOptions);
    return res.status(200).json({ sucess: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ "we have faced an error": error.message });
  }
});

//starting the server at the port
app.listen(PORT, () => {
  console.log("server is running at the port " + PORT);
});
