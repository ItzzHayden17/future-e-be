require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const admin = require("firebase-admin");
const serviceAccount = require("./futur-e-firebase-adminsdk-fbsvc-4f1e481bfe.json");

const app = express();
const PORT = 8080;

//firesbase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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
  console.log(req.body);
  
  const { name_surname, cellphone, type,email } = req.body;

  // Setup transporter
  console.log(req.body);
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com", // REQUIRED, or it will use localhost (::1)
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER, // full email address
    pass: process.env.EMAIL_PASS
  }
});

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.TO_EMAIL, // Who should receive it
    subject: 'New Lead from Future-e Contact Form',
    text: `Name: ${name_surname}\nCellphone: ${cellphone}\nType: ${type}\nEmail address: ${email}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send(200)
  } catch (error) {
    console.error(error);
    res.status(500)
  }
});

app.get("/",(req,res)=>{
  res.send(200)
})

app.post("/login-admin", (req, res) => {
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

app.get("/companies", (req, res) => {  //get all companies from database
  const companies = [];

  async function fetchCompanies() {
    const snapshot = await db.collection('companies').get();
    snapshot.forEach(doc => {
      companies.push({ id: doc.id, ...doc.data() });
    });
    res.json(companies);
    console.log('Fetched companies: ', companies);
  }

  fetchCompanies()
})

app.post("/company-login", async (req, res) => {  //company login

  //to do : fetch company from database and reply with all info
  console.log(req.body.companyName);

  const snapshot = await db.collection('companies')
  .where('companyName', '==', req.body.companyName)
  .where('password', '==', req.body.password)
  .limit(1)
  .get();

if (!snapshot.empty) {
  const doc = snapshot.docs[0];   // first result
  res.json({ success: true, company: { id: doc.id, ...doc.data() } });
} else {
  console.log("No matching company found");
  res.json({ success: false });
}
    
});

app.post("/claims", (req, res) => {   //claim submission must go to email

 })

app.post("/add-company", (req, res) => {  //add company to database

  console.log(req.body);
  

  async function addUser() {
    
    const docRef = db.collection('companies').doc(); // Automatically generate unique ID
    await docRef.set({
      companyName: req.body.companyName,
      password: req.body.password,
      towingServiceNumber: req.body.towingNumber
    });

    res.send(200);
    console.log('Company added with ID: ', docRef.id);
  }
  
  addUser()
 })

app.post("/edit-company", (req, res) => {  //update company in database

  const { id, companyName, password, towingNumber } = req.body;

  console.log(req.body);
  

  async function updateCompany() {
  await db.collection("companies").doc(id).update({
    companyName: companyName,
    password: password,
    towingServiceNumber: towingNumber
  });
  console.log("Company updated!");
}

  updateCompany();

 })


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
