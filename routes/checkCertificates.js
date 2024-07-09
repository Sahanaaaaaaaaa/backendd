const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

const CertificateAuthority = require('../models/CertificateAuthority');
const Certificate = require('../models/Certificate');

const caDir = path.join(__dirname, '..', 'ca');
const certDir = path.join(__dirname, '..', 'certs');
const archiveDir = path.join(caDir, 'archive');

if (!fs.existsSync(caDir)) fs.mkdirSync(caDir);
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);

const executeCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: caDir }, (error, stdout, stderr) => {
            if (error) reject(`Error: ${stderr}`);
            else resolve(stdout);
        });
    });
};

const initGridFS = async () => {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'ca_files' });
    return bucket;
};

const uploadFileToGridFS = async (bucket, commonName, fileName) => {
    const filePath = path.join(archiveDir, commonName, fileName);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const uploadStream = bucket.openUploadStream(fileName);
    const fileStream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
        fileStream.pipe(uploadStream)
            .on('finish', () => resolve(uploadStream.id))
            .on('error', (error) => reject(error));
    });
};

const downloadFileFromGridFS = (bucket, fileId, res) => {
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    downloadStream.pipe(res)
        .on('error', (error) => {
            res.status(500).send(`Error downloading file: ${error}`);
        });
};

// Certificate renewal logic
const renewCertificate = async (certificate) => {
    const { commonName, issuedBy, username, csrId, country, organization, subscriptionDays, publicKey } = certificate;
    const ca = await CertificateAuthority.findById(issuedBy);
    if (!ca) throw new Error('Certificate Authority not found');

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'ca_files' });

    const caKeyFileId = ca.key;
    const caCrtFileId = ca.certificate;

    const caKeyPath = path.join(certDir, `${issuedBy}_ca.key`);
    const caCrtPath = path.join(certDir, `${issuedBy}_ca.crt`);

    await downloadFileFromGridFS(bucket, caKeyFileId, fs.createWriteStream(caKeyPath));
    await downloadFileFromGridFS(bucket, caCrtFileId, fs.createWriteStream(caCrtPath));

    const csrPath = path.join(certDir, `${commonName}.csr`);
    const certPath = path.join(certDir, `${commonName}.crt`);
    const countryCodes = { "United Kingdom": "UK", "India": "IN", "Canada": "CA", "United States": "US", "Australia": "AU" };
    const countryCode = countryCodes[country] || country;

    const cmdCreateCSR = `openssl req -new -newkey rsa:2048 -nodes -keyout ${path.join(certDir, `${commonName}.key`)} -out ${csrPath} -subj "/C=${countryCode}/ST=State/L=Locality/O=${organization}/CN=${commonName}"`;
    await executeCommand(cmdCreateCSR);

    const cmdSignCSR = `openssl x509 -req -in ${csrPath} -CA ${caCrtPath} -CAkey ${caKeyPath} -CAcreateserial -out ${certPath} -days ${subscriptionDays}`;
    await executeCommand(cmdSignCSR);

    if (!fs.existsSync(certPath)) throw new Error(`File not found: ${certPath}`);

    const issuedCertFileId = await uploadFileToGridFS(bucket, `${commonName}`, `ca.crt`);

    const dateAuthorized = new Date();
    const expiryDate = new Date(dateAuthorized);
    expiryDate.setDate(expiryDate.getDate() + subscriptionDays);

    await Certificate.findByIdAndUpdate(certificate._id, {
        certificate: issuedCertFileId,
        dateAuthorized,
        expiryDate
    });

    console.log(`Certificate for ${commonName} renewed successfully`);
};

// Cron job to check and renew certificates
cron.schedule('0 0 * * *', async () => {  // Runs every day at midnight
    try {
        const certificates = await Certificate.find();
        const currentDate = new Date();

        for (const certificate of certificates) {
            if (certificate.expiryDate <= currentDate) {
                await renewCertificate(certificate);
            }
        }

        console.log('Certificate check and renewal process completed');
    } catch (error) {
        console.error('Error during certificate renewal process:', error);
    }
});

router.post('/add', async (req, res) => {
    const { commonName } = req.body;

    try {
        await generateRootCertificate(commonName);
        await createCSR();
        await signCSR();
        await createCRL();
        await archiveCAFiles(commonName);

        const bucket = await initGridFS();

        const [crtFileId, keyFileId, srlFileId] = await Promise.all([
            uploadFileToGridFS(bucket, commonName, 'ca.crt'),
            uploadFileToGridFS(bucket, commonName, 'ca.key'),
            uploadFileToGridFS(bucket, commonName, 'ca.srl')
        ]);

        const ca = new CertificateAuthority({
            commonName,
            certificate: new ObjectId(crtFileId),
            key: new ObjectId(keyFileId),
            srl: new ObjectId(srlFileId)
        });

        await ca.save();

        res.status(200).send('Certificate Authority created successfully');
    } catch (error) {
        res.status(500).send('Error creating Certificate Authority');
    }
});

router.get('/list', async (req, res) => {
    try {
        const cas = await CertificateAuthority.find();
        res.status(200).json(cas);
    } catch (error) {
        res.status(500).send('Error fetching Certificate Authorities');
    }
});

router.get('/file/:id', async (req, res) => {
    try {
        const caId = req.params.id;

        const ca = await CertificateAuthority.findById(caId);
        if (!ca) return res.status(404).send('Certificate Authority not found');

        const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'ca_files' });

        const downloadStream = bucket.openDownloadStream(ca.certificate);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="ca.crt"`);

        downloadStream.pipe(res)
            .on('error', (error) => {
                res.status(500).send(`Error downloading file: ${error}`);
            });

    } catch (error) {
        res.status(500).send('Error downloading file');
    }
});

router.post('/issue', async (req, res) => {
    const { commonName, caId, username, csrId, country, organization, subscriptionDays, publicKey } = req.body;

    if (!commonName || !caId || !username || !csrId || !country || !organization || !publicKey) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const ca = await CertificateAuthority.findById(caId);
        if (!ca) return res.status(404).send('Certificate Authority not found');

        const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'ca_files' });

        const caKeyFileId = ca.key;
        const caCrtFileId = ca.certificate;

        const caKeyPath = path.join(certDir, `${caId}_ca.key`);
        const caCrtPath = path.join(certDir, `${caId}_ca.crt`);

        await downloadFileFromGridFS(bucket, caKeyFileId, fs.createWriteStream(caKeyPath));
        await downloadFileFromGridFS(bucket, caCrtFileId, fs.createWriteStream(caCrtPath));

        const csrPath = path.join(certDir, `${commonName}.csr`);
        const certPath = path.join(certDir, `${commonName}.crt`);
        const countryCode = countryCodes[country] || country;

        const cmdCreateCSR = `openssl req -new -newkey rsa:2048 -nodes -keyout ${path.join(certDir, `${commonName}.key`)} -out ${csrPath} -subj "/C=${countryCode}/ST=State/L=Locality/O=${organization}/CN=${commonName}"`;
        await executeCommand(cmdCreateCSR);

        const cmdSignCSR = `openssl x509 -req -in ${csrPath} -CA ${caCrtPath} -CAkey ${caKeyPath} -CAcreateserial -out ${certPath} -days ${subscriptionDays}`;
        await executeCommand(cmdSignCSR);

        if (!fs.existsSync(certPath)) throw new Error(`File not found: ${certPath}`);

        const issuedCertFileId = await uploadFileToGridFS(bucket, commonName, `${commonName}.crt`);
        
        const dateAuthorized = new Date();
        const expiryDate = new Date(dateAuthorized);
        expiryDate.setDate(expiryDate.getDate() + subscriptionDays);

        const newCertificate = new Certificate({
            commonName,
            certificate: issuedCertFileId,
            issuedBy: caId,
            ca: ca.commonName,
            username,
            csrId,
            country,
            dateAuthorized,
            publicKey,
            subscriptionDays,
            expiryDate
        });

        await newCertificate.save();

        res.status(200).json({ message: 'Certificate issued successfully', certificate: newCertificate });
    } catch (error) {
        res.status(500).send(`Error issuing certificate: ${error.message}`);
    }
});

module.exports = router;
