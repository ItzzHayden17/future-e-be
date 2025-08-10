require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 8080;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Allow CORS if form is served from another domain
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/submit-form', async (req, res) => {
  const { name_surname, cellphone, type } = req.body;

  // Setup transporter
  console.log(req.body);
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or 'smtp.ethereal.email' etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // App password (not your normal password)
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.TO_EMAIL, // Who should receive it
    subject: 'New Lead from Future-e Contact Form',
    text: `Name: ${name_surname}\nCellphone: ${cellphone}\nType: ${type}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending email.');
  }
});

app.get("/",(req,res)=>{
  res.send(200)
})

app.post("/login", (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;

  if (username === process.env.USER && password === process.env.PASS) {
    const success = true
    console.log("Valid login");
    
    res.json({ success });
  }else{
      res.json({ success: false });
    }
  
})

app.get("/under-construction", (req, res) => {
  res.json({underConstruction: true});
})
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
