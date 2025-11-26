require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const admin = require("firebase-admin");
const serviceAccount = require("./futur-e-docs-firebase-adminsdk-fbsvc-2f4fb93b31.json");
const multer = require('multer');
const app = express();
const PORT = 8080;
const upload = multer({ storage: multer.memoryStorage() });
const { Storage } = require("@google-cloud/storage");


const storage = new Storage({
  keyFilename: "./futur-e-docs-firebase-adminsdk-fbsvc-2f4fb93b31.json",
});

const bucket = storage.bucket("gs://futur-e-docs.firebasestorage.app");

async function uploadFile(pathToLocalFile, destination) {
  await bucket.upload(pathToLocalFile, {
    destination,
  });

  console.log("Uploaded:", destination);
}

module.exports = { uploadFile };


//firesbase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const transporter = nodemailer.createTransport({
    host: "cp68.domains.co.za",  // correct SMTP server
    port: 465,                    // SSL port
    secure: true,                 // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,  // e.g., no-reply@novexo.co.za
        pass: process.env.EMAIL_PASS   // email password
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
    from: "no-reply@novexo.co.za",
    to: "marketing@futur-e.co.za",//"marketing@futur-e.co.za", // Who should receive it
    subject: 'New Lead from Future-e Contact Form',
    text: `Name: ${name_surname}\nCellphone: ${cellphone}\nType: ${type}\nEmail address: ${email}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send(200)
    console.log("Email sent" );
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

app.post("/claims", upload.array("images",50),async (req, res) => {   //claim submission must go to email

  const {date_time,place,desc_other_vehicle,other_driver_details,owner_details,insurance_company_of_other_driver,witness_contact_details,police_officer_details,accident_description,companyName,accident_sketch} = req.body
  

  const imageAttachments = req.files.map(file => ({
    filename: file.originalname,
    content: file.buffer,
    contentType: file.mimetype
  }));

    const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "claims@futur-e.co.za", // Who should receive it |   SONY.ANRAY743@GMAIL.COM
    subject: `New Claim from Future-e claims portal for ${companyName}`,
    text: `DATE, TIME, AND PLACE OF ACCIDENT: ${date_time}\n
           PLACE OF ACCIDENT: ${place}\n
           OTHER VEHICLE(S) DETAILS – MAKE(S), COLOUR(S) AND REGISTRATION NUMBER(S): ${desc_other_vehicle}\n
           OTHER DRIVER(S) DETAILS – NAME(S), SURNAME(S), ADDRESS(ES), PHONE NUMBER(S),ID NUMBER(S): ${other_driver_details}\n
           OWNER DETAILS (ONLY IF THE DRIVER IS NOT THE OWNER) – NAME, ADDRESS, PHONE NUMBER: ${owner_details}\n
           INSURANCE COMPANY(IES) – WITH WHICH THE OTHER VEHICLE(S) IS/ARE INSURED?: ${insurance_company_of_other_driver}\n
           NAME AND CONTACT DETAILS OF ANY WITNESS(ES): ${witness_contact_details}\n
           NAME AND STATION OF THE POLICE/TRAFFIC OFFICER – IF PRESENT: ${police_officer_details}\n
           GIVE A SHORT DISCRIPTION OF THE ACCIDENT: ${accident_description}\n 
           `,
    attachments: imageAttachments
           
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

app.post("/add-company", upload.single("file"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    // Create a reference to the file in GCS
    const fileName = `company_docs/${req.body.companyName}_Claim_Form.pdf`;
    const gcsFile = bucket.file(fileName);

    // Upload the buffer directly
    await gcsFile.save(req.file.buffer, {
      contentType: req.file.mimetype,
    });

    // Make the file public (optional, only if you want everyone to access it)
    // await gcsFile.makePublic();
    // const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Or, generate a signed URL (valid for 1 year)
    const expires = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
    const [fileUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires,
    });

    // Save company info to Firestore, including file URL
    const docRef = db.collection("companies").doc();
    await docRef.set({
      companyName: req.body.companyName,
      password: req.body.password,
      towingServiceNumber: req.body.towingNumber,
      policyNumber: req.body.policyNumber,
      claimFormUrl: fileUrl,  // <-- store the URL here
    });

    res.sendStatus(200);
    console.log("Company added:", docRef.id);
    console.log("File URL:", fileUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading file");
  }
});

app.post("/edit-company", upload.single("file"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { id, companyName, password, towingNumber, policyNumber } = req.body;

    const updateData = {
      companyName,
      password,
      towingServiceNumber: towingNumber,
      policyNumber,
    };

    // If a new file is uploaded, save it to GCS and add the URL to updateData
    if (req.file) {
      const fileName = `company_docs/${companyName}_Claim_Form.pdf`;
      const gcsFile = bucket.file(fileName);

      await gcsFile.save(req.file.buffer, {
        contentType: req.file.mimetype,
      });

      // Generate a signed URL (1 year validity)
      const expires = Date.now() + 365 * 24 * 60 * 60 * 1000;
      const [fileUrl] = await gcsFile.getSignedUrl({
        action: "read",
        expires,
      });

      updateData.claimFormUrl = fileUrl;
    }

    // Update Firestore
    await db.collection("companies").doc(id).update(updateData);

    console.log("Company updated:", id);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating company");
  }
});

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
