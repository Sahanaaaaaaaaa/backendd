import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Info.css';  // Import a CSS file for styling if needed

const Info = () => {
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await axios.get('http://localhost:5000/certificates');
        setCertificates(response.data);
      } catch (error) {
        console.error('Error fetching certificates:', error);
      }
    };

    fetchCertificates();
  }, []);

  return (
    <div className="info-container">
      <h1>Certificates Information</h1>
      <table className="info-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Organization</th>
            <th>Signing CA</th>
            <th>Expiry Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((cert) => (
            <tr key={cert._id}>
              <td>{cert.username}</td>
              <td>{cert.organization}</td>
              <td>{cert.signingCA}</td>
              <td>{new Date(cert.expiryDate).toLocaleDateString()}</td>
              <td>{cert.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Info;
