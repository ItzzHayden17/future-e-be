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

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com", // REQUIRED, or it will use localhost (::1)
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER, // full email address
    pass: process.env.EMAIL_PASS
  },
    tls: {
    ciphers: "SSLv3"
  }
  
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));          // for JSON requests
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Allow CORS if form is served from another domain
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/submit-form', async (req, res) => {
  console.log(req.body);
  
  const { name_surname, cellphone, type,email } = req.body;

  
  console.log(req.body);


  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "sony.anray743@gmail.com", // Who should receive it
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

app.post("/claims", async (req, res) => {   //claim submission must go to email

  const {date_time_place,desc_other_vehicle,other_driver_details,owner_details,insurance_company_of_other_driver,witness_contact_details,police_officer_details,accident_description,companyName,accident_sketch} = req.body
  const base64Data = accident_sketch.replace(/^data:image\/png;base64,/, "");

    const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "marketing@futur-e.co.za", // Who should receive it
    subject: `New Claim from Future-e claims portal for ${companyName}`,
    text: `DATE, TIME, AND PLACE OF ACCIDENT: ${date_time_place}\n
           OTHER VEHICLE(S) DETAILS – MAKE(S), COLOUR(S) AND REGISTRATION NUMBER(S): ${desc_other_vehicle}\n
           OTHER DRIVER(S) DETAILS – NAME(S), SURNAME(S), ADDRESS(ES), PHONE NUMBER(S),ID NUMBER(S): ${other_driver_details}\n
           OWNER DETAILS (ONLY IF THE DRIVER IS NOT THE OWNER) – NAME, ADDRESS, PHONE NUMBER: ${owner_details}\n
           INSURANCE COMPANY(IES) – WITH WHICH THE OTHER VEHICLE(S) IS/ARE INSURED?: ${insurance_company_of_other_driver}\n
           NAME AND CONTACT DETAILS OF ANY WITNESS(ES): ${witness_contact_details}\n
           NAME AND STATION OF THE POLICE/TRAFFIC OFFICER – IF PRESENT: ${police_officer_details}\n
           GIVE A SHORT DISCRIPTION OF THE ACCIDENT: ${accident_description}\n 
           `,
    attachments: [
    {
      filename: 'accident.png',
      content: base64Data,
      encoding: 'base64',
    },
  ],
           
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send(200)
    console.log("claim sent" );
  } catch (error) {
    console.error(error);
    res.status(400)
    
    
  
 }
})

app.post("/add-company", (req, res) => {  //add company to database

  console.log(req.body);
  

  async function addUser() {
    
    const docRef = db.collection('companies').doc(); // Automatically generate unique ID
    await docRef.set({
      companyName: req.body.companyName,
      password: req.body.password,
      towingServiceNumber: req.body.towingNumber,
      policyNumber : req.body.policyNumber
    });

    res.send(200);
    console.log('Company added with ID: ', docRef.id);
  }
  
  addUser()
 })

app.post("/edit-company", (req, res) => {  //update company in database

  const { id, companyName, password, towingNumber,policyNumber } = req.body;

  console.log(req.body);
  

  async function updateCompany() {
  await db.collection("companies").doc(id).update({
    companyName: companyName,
    password: password,
    towingServiceNumber: towingNumber,
    policyNumber : policyNumber
  });
  console.log("Company updated!");
}

  updateCompany();
  res.send(200)

 })

 app.post("/delete/:id",async (req,res)=>{
  const companyId = req.params.id;

  try {
    // reference to the document
    const docRef = db.collection("companies").doc(companyId);

    // check if doc exists
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Company not found" });
    }

    // delete it
    await docRef.delete();

    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ error: "Failed to delete company" });
  }
 })

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
