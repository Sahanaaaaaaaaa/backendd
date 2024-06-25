import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, Typography, Button } from '@mui/material';

const CSRList = () => {
  const [csrs, setCsrs] = useState([]);

  useEffect(() => {
    const fetchCSRs = async () => {
      try {
        const response = await axios.get('http://localhost:5000/csrs');
        setCsrs(response.data);
      } catch (error) {
        console.error('Error fetching CSRs:', error);
      }
    };
    fetchCSRs();
  }, []);

  const authorizeCSR = async (id) => {
    try {
      await axios.post(`http://localhost:5000/authorize/${id}`);
      setCsrs(csrs.map(csr => csr._id === id ? { ...csr, status: 'Authorized' } : csr));
      downloadCertificate(id); // Call to download the certificate
    } catch (error) {
      console.error('Error authorizing CSR:', error);
    }
  };

  const downloadCertificate = async (id) => {
    try {
      console.log(`Starting download for certificate ID: ${id}`);
      const response = await axios.get(`http://localhost:5000/download/${id}`, {
        responseType: 'blob',
      });

      console.log('Download response:', response);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${id}.crt`); // You can use csr.username or another name if available
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); // Clean up
    } catch (error) {
      console.error('Error downloading certificate:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      {csrs.map((csr) => (
        <Card key={csr._id} style={{ minWidth: 300, margin: '10px', borderRadius: 15, backgroundColor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h5" component="div" style={{ textAlign: 'center' }}>
              {csr.username}
            </Typography>
            <Typography variant="body1" component="div" style={{ textAlign: 'center', marginTop: '10px' }}>
              Status: {csr.status}
            </Typography>
            {csr.status === 'Pending' && (
              <Button variant="contained" color="primary" style={{ marginTop: '10px' }} onClick={() => authorizeCSR(csr._id)}>
                Authorize
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CSRList;
