const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  issuedDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  security: { type: Number, required: true }
});

module.exports = mongoose.model('Certificate', CertificateSchema);
