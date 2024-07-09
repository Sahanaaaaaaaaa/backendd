const mongoose = require('mongoose');
const { Schema } = mongoose;

const CertificateSchema = new Schema({
    commonName: {
        type: String,
        required: true,
    },
    certificate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ca_files',
        required: true,
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CertificateAuthority',
        required: true,
    },
    ca: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CertificateAuthority',
        required: true,
    },
    username: {
        type: String,
        ref: 'cloud_csr_info',
        required: true, // Update this as per your requirements
    },
    csrId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cloud_csr_info', // Assuming you have a CSR model, update this ref accordingly
        required: true, // Update this as per your requirements
    },
    country: {
        type: String,
        ref: 'cloud_csr_info', // Assuming you have a CSR model, update this ref accordingly
        required: true, // Update this as per your requirements
    },
    dateAuthorized: {
        type: Date,
        default: Date.now, // Set default value to current date and time
    },
    publicKey: {
        type: String,
        ref: 'cloud_csr_info', // Assuming you have a CSR model, update this ref accordingly
        required: true, // Update this as per your requirements
    },
    subscriptionDays: {
        type: Number,
        required: true, // Add this field to store the subscription duration in days
    },
    expiryDate: {
        type: Date, // Add expiryDate field to store the calculated expiry date
        required: true,
    },
});

/* // Ensure unique index on commonName field
CertificateSchema.index({ commonName: 1 }, { unique: true }); */

// Pre-save middleware to calculate the expiry date
CertificateSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('dateAuthorized') || this.isModified('subscriptionDays')) {
        console.log('Updating expiryDate for certificate:', this.commonName);
        
        // Log current values
        console.log('Current dateAuthorized:', this.dateAuthorized);
        console.log('Current subscriptionDays:', this.subscriptionDays);

        // Calculate expiryDate
        const expiryDate = new Date(this.dateAuthorized);
        expiryDate.setDate(expiryDate.getDate() + this.subscriptionDays);
        this.expiryDate = expiryDate;

        // Log calculated expiryDate
        console.log('Calculated expiryDate:', this.expiryDate);
    }
    next();
});

const Certificate = mongoose.model('Certificate', CertificateSchema);

module.exports = Certificate;
