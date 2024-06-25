import React, { useState, useEffect } from 'react';
import { Button, TextField, MenuItem, Select, FormControl, InputLabel, Box, Typography } from '@mui/material';
import axios from 'axios';

const Certificates = () => {
  const [cas, setCas] = useState([]);
  const [selectedCa, setSelectedCa] = useState('');
  const [newCa, setNewCa] = useState('');
  const [showNewCaInput, setShowNewCaInput] = useState(false);

  useEffect(() => {
    // Fetch the list of existing CAs (this could be from your server or a static list)
    const fetchCas = async () => {
      try {
        const response = await axios.get('/api/cas');
        setCas(response.data);
      } catch (error) {
        console.error('Error fetching CAs:', error);
      }
    };

    fetchCas();
  }, []);

  const handleCreateCa = async () => {
    // Add logic to create a new CA
    try {
      const response = await axios.post('/api/cas', { name: newCa });
      setCas([...cas, response.data]);
      setNewCa('');
      setShowNewCaInput(false);
    } catch (error) {
      console.error('Error creating CA:', error);
    }
  };

  const handleIssueCertificate = async () => {
    // Add logic to issue a certificate using OpenSSL
    try {
      const response = await axios.post('/api/issue-certificate', { ca: selectedCa });
      console.log('Certificate issued:', response.data);
    } catch (error) {
      console.error('Error issuing certificate:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Manage Certificates</Typography>

      {/* Choose Existing CA or Enter New One */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="ca-label">Choose Existing CA or Enter New One</InputLabel>
        <Select
          labelId="ca-label"
          value={selectedCa}
          onChange={(e) => setSelectedCa(e.target.value)}
          label="Choose Existing CA or Enter New One"
        >
          {cas.map((ca) => (
            <MenuItem key={ca.id} value={ca.name}>{ca.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        onClick={() => setShowNewCaInput(!showNewCaInput)}
        sx={{ mb: 2 }}
      >
        {showNewCaInput ? 'Cancel' : 'Create New CA'}
      </Button>

      {showNewCaInput && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="New CA Name"
            value={newCa}
            onChange={(e) => setNewCa(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={handleCreateCa}>Create</Button>
        </Box>
      )}

      {/* Issue Certificate */}
      <Button variant="contained" color="primary" onClick={handleIssueCertificate}>Issue Certificate</Button>
    </Box>
  );
};

export default Certificates;
