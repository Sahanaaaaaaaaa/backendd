import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Certificates from './components/Certificates';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import CSRList from './components/CSRList';
import Info from './components/Info';
import axios from 'axios';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false); // Set to true for testing

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogin = async (formData) => {
    try {
      const response = await axios.post('http://localhost:5000/login', formData);
      console.log(response.data);
      setLoggedIn(true);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const handleRegister = async (formData) => {
    try {
      const response = await axios.post('http://localhost:5000/register', formData);
      console.log(response.data);
      setLoggedIn(true);
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {loggedIn && <Navbar toggleSidebar={toggleSidebar} />}
        <div style={{ display: 'flex', flexGrow: 1, marginTop: loggedIn ? '60px' : 0 }}>
          {loggedIn && <Sidebar open={sidebarOpen} />}
          <div style={{ flexGrow: 1, padding: '20px', overflow: 'auto' }}>
            <Routes>
              {loggedIn ? (
                <>
                  <Route path="/" element={<Home />} />
                  <Route path="/A/1" element={<Certificates />} />
                  <Route path="/Stats/1" element={<Dashboard />} />
                  <Route path="/PendingRequests/1" element={<CSRList />} />
                  <Route path="/Info/1" element={<Info />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Login handleLogin={handleLogin} />} />
                  <Route path="/register" element={<Register handleRegister={handleRegister} />} />
                  <Route path="/login" element={<Login handleLogin={handleLogin} />} />
                  <Route path="/csrs" element={<CSRList />} />
                </>
              )}
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
