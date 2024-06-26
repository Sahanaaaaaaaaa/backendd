const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const password = encodeURIComponent('LcDL6n?&8RzY$kgJ');
const uri = `mongodb+srv://mongo:${password}@cluster0.wccrmo0.mongodb.net/netflix_dummy_server?retryWrites=true&w=majority`;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Could not connect to MongoDB Atlas...', err));

const userSchema = new mongoose.Schema({
  d_username: { type: String, required: true },
  d_password: { type: String, required: true },
}, { collection: 'login_info' });

const User = mongoose.model('User', userSchema);

const csrSchema = new mongoose.Schema({
  username: { type: String, required: true },
  organization: { type: String, default: "PES University" },
  signingCA: { type: String },
  expiryDate: { type: Date },
  status: { type: String, default: 'Pending' },
}, { collection: 'csr_info' });

const CSR = mongoose.model('CSR', csrSchema);

const createCSR = async (username, organization, subscriptionDays) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + subscriptionDays);

  const newCSR = new CSR({ username, expiryDate });
  await newCSR.save();

  // Notify all connected clients about the new CSR
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'newCSR', csr: newCSR }));
    }
  });
};

// WebSocket Server
const server = app.listen(5000, () => {
  console.log('Server is running on port 5000');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Watch for new entries in the 'csr_info' collection
const csrCollection = mongoose.connection.collection('csr_info');
csrCollection.watch().on('change', async (change) => {
  if (change.operationType === 'insert') {
    const newCSR = change.fullDocument;
    // Notify all connected clients about the new CSR
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'newCSR', csr: newCSR }));
      }
    });
  }
});

app.post('/login', async (req, res) => {
  const { d_username, d_password } = req.body;
  try {
    const user = await User.findOne({ d_username, d_password });
    if (user) {
      res.status(200).json({ message: 'Login successful' });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/register', async (req, res) => {
  const { d_username, d_password } = req.body;
  try {
    const existingUser = await User.findOne({ d_username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const newUser = new User({ d_username, d_password });
    await newUser.save();

    res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/csrs', async (req, res) => {
  try {
    const csrs = await CSR.find();
    res.status(200).json(csrs);
  } catch (error) {
    console.error('Error fetching CSRs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/certificates', async (req, res) => {
  try {
    const certificates = await CSR.find({ status: 'Authorized' });
    res.status(200).json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/authorize/:id', async (req, res) => {
  try {
    const csr = await CSR.findById(req.params.id);
    if (!csr) {
      return res.status(404).json({ message: 'CSR not found' });
    }

    const daysValid = 365; // Default validity period of 365 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);

    const certPath = path.join(__dirname, 'certs', `${csr.username}.crt`);
    const certCommand = `
      openssl x509 -req -in ${csr.csrPath} -signkey ${csr.keyPath} -out ${certPath} -days ${daysValid}
    `;

    exec(certCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating certificate for ${csr.username}:`, error);
        return res.status(500).json({ message: 'Error creating certificate' });
      }
      console.log(`Certificate created for ${csr.username}:\n`, stdout);

      csr.status = 'Authorized';
      csr.certPath = certPath;
      csr.expiryDate = expiryDate;
      csr.signingCA = 'Your CA';
      await csr.save();

      res.status(200).json({ message: 'CSR authorized and certificate created' });
    });
  } catch (error) {
    console.error('Error authorizing CSR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/download/:id', async (req, res) => {
  try {
    const csr = await CSR.findById(req.params.id);
    if (!csr) {
      return res.status(404).json({ message: 'CSR not found' });
    }

    const certPath = csr.certPath;
    if (!fs.existsSync(certPath)) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.download(certPath, `${csr.username}.crt`, (err) => {
      if (err) {
        console.error('Error sending certificate:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app };
