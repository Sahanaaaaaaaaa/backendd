const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');  // MongoDB native driver components

// Load the Mongoose model
const CertificateAuthority = require('../models/CertificateAuthority');

// Directory to store CA files
const caDir = path.join(__dirname, '..', 'ca');
const archiveDir = path.join(caDir, 'archive');

if (!fs.existsSync(caDir)) {
    fs.mkdirSync(caDir);
}

if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir);
}

// Helper function to execute a command and log the results
const executeCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${cmd}`);
        exec(cmd, { cwd: caDir }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${stderr}`);
                reject(`Error: ${stderr}`);
            } else {
                console.log(`Output: ${stdout}`);
                resolve(stdout);
            }
        });
    });
};

// Function to archive CA files under the archive directory with common name and original file names
const archiveCAFiles = async (commonName) => {
    // Create a directory with commonName under archive if it doesn't exist
    const archiveCommonDir = path.join(archiveDir, commonName);
    if (!fs.existsSync(archiveCommonDir)) {
        fs.mkdirSync(archiveCommonDir);
    }

    // Archive CA files under commonName directory with original file names
    const filesToArchive = ['ca.crt', 'ca.key', 'ca.srl'];
    filesToArchive.forEach((file) => {
        const filePath = path.join(caDir, file);
        if (fs.existsSync(filePath)) {
            fs.renameSync(filePath, path.join(archiveCommonDir, file));
            console.log(`Archived ${file} for ${commonName}`);
        } else {
            console.warn(`File not found: ${file}`);
        }
    });
};

// Initialize MongoDB GridFSBucket
const initGridFS = async () => {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, {
        bucketName: 'ca_files'  // Name of the GridFS bucket
    });

    return bucket;
};

// Function to upload file to MongoDB GridFS
const uploadFileToGridFS = async (bucket, commonName, fileName) => {
    const filePath = path.join(archiveDir, commonName, fileName);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const uploadStream = bucket.openUploadStream(fileName);
    const fileStream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
        fileStream.pipe(uploadStream)
            .on('finish', () => resolve(uploadStream.id))
            .on('error', (error) => reject(error));
    });
};

// Function to download file from MongoDB GridFS
const downloadFileFromGridFS = (bucket, fileId, res) => {
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    downloadStream.pipe(res)
        .on('error', (error) => {
            console.error(`Error downloading file: ${error}`);
            res.status(500).send(`Error downloading file: ${error}`);
        });
};

// Step 1: Generate the Root Certificate and Private Key
const generateRootCertificate = (commonName) => {
    const cmd = `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${path.join(caDir, 'ca.key')} -out ${path.join(caDir, 'ca.crt')} -days 3650 -subj "/C=US/ST=State/L=Locality/O=Organization/CN=${commonName}"`;
    return executeCommand(cmd);
};

// Step 2: Create a Certificate Signing Request (CSR)
const createCSR = () => {
    const cmd = `openssl req -new -key ${path.join(caDir, 'ca.key')} -out ${path.join(caDir, 'ca.csr')} -subj "/C=US/ST=State/L=Locality/O=Organization/CN=Root CA"`;
    return executeCommand(cmd);
};

// Step 3: Sign the Certificate Signing Request (CSR)
const signCSR = () => {
    const cmd = `openssl x509 -req -in ${path.join(caDir, 'ca.csr')} -CA ${path.join(caDir, 'ca.crt')} -CAkey ${path.join(caDir, 'ca.key')} -CAcreateserial -out ${path.join(caDir, 'ca.crt')}`;
    return executeCommand(cmd);
};

// Step 4: Create a Certificate Revocation List (CRL)
const createCRL = () => {
    return new Promise((resolve, reject) => {
        const cmd = `openssl ca -gencrl -keyfile ${path.join(caDir, 'ca.key')} -cert ${path.join(caDir, 'ca.crt')} -out ${path.join(caDir, 'crl.pem')} -config ${path.join(__dirname, 'openssl.cnf')}`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error creating CRL: ${stderr}`);
                reject(`Error creating CRL: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
};

// Route to add a new Certificate Authority
router.post('/add', async (req, res) => {
    const { commonName } = req.body;

    try {
        // Generate root certificate and private key
        console.log('Generating root certificate and private key...');
        await generateRootCertificate(commonName);
        console.log('Root certificate and private key generated.');

        // Create CSR
        console.log('Creating CSR...');
        await createCSR();
        console.log('CSR created.');

        // Sign CSR
        console.log('Signing CSR...');
        await signCSR();
        console.log('CSR signed.');

        // Create CRL
        console.log('Creating CRL...');
        await createCRL();
        console.log('CRL created.');

        // Archive CA files
        console.log('Archiving CA files...');
        await archiveCAFiles(commonName);
        console.log('CA files archived.');

        // Initialize GridFS bucket
        const bucket = await initGridFS();

        // Upload .crt, .key, and .srl files to GridFS
        const [crtFileId, keyFileId, srlFileId] = await Promise.all([
            uploadFileToGridFS(bucket, commonName, 'ca.crt'),
            uploadFileToGridFS(bucket, commonName, 'ca.key'),
            uploadFileToGridFS(bucket, commonName, 'ca.srl')
        ]);

        // Save commonName and file ObjectIds to MongoDB
        const ca = new CertificateAuthority({
            commonName,
            certificate: new ObjectId(crtFileId),
            key: new ObjectId(keyFileId),
            srl: new ObjectId(srlFileId)
        });

        await ca.save();
        console.log('Certificate Authority saved to database.');

        res.status(200).send('Certificate Authority created successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating Certificate Authority');
    }
});

// Route to download a file from GridFS
router.get('/file/:id', async (req, res) => {
    try {
        const caId = req.params.id;
        
        // Find the CA metadata
        const ca = await CertificateAuthority.findById(caId);
        if (!ca) {
            return res.status(404).send('Certificate Authority not found');
        }

        const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'ca_files' });

        // Example: Downloading the certificate file
        const downloadStream = bucket.openDownloadStream(ca.certificate);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="ca.crt"`);

        downloadStream.pipe(res)
            .on('error', (error) => {
                console.error(`Error downloading file: ${error}`);
                res.status(500).send(`Error downloading file: ${error}`);
            });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error downloading file');
    }
});

module.exports = router;