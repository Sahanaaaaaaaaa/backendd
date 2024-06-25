const express = require('express');
const Certificate = require('../models/Certificate');
const router = express.Router();

router.get('/issued', async (req, res) => {
  try {
    const count = await Certificate.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get('/active', async (req, res) => {
  try {
    const count = await Certificate.countDocuments({ isActive: true });
    res.json({ count });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get('/security', async (req, res) => {
  try {
    const certificates = await Certificate.find();
    const data = certificates.map(cert => ({
      name: cert.issuedDate.toLocaleDateString(),
      security: cert.security
    }));
    res.json(data);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
