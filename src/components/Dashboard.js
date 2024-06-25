import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { LineChart, Line } from 'recharts';

const stats = [
  { title: "Active Certificates", number: 124 },
  { title: "Certificates Revoked", number: 8 },
  { title: "Number of CAs", number: 15 },
];

const barData = [
  { name: 'Month', value: 30 },
  { name: 'Week', value: 20 },
  { name: 'Day', value: 10 },
];

const pieData = [
  { name: 'CA 1', value: 10 },
  { name: 'CA 2', value: 20 },
  { name: 'CA 3', value: 30 },
  { name: 'CA 4', value: 20 },
  { name: 'CA 5', value: 20 },
];

const lineData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 200 },
  { name: 'Apr', value: 278 },
  { name: 'May', value: 189 },
  { name: 'Jun', value: 239 },
  { name: 'Jul', value: 349 },
  { name: 'Aug', value: 200 },
  { name: 'Sep', value: 278 },
  { name: 'Oct', value: 189 },
  { name: 'Nov', value: 239 },
  { name: 'Dec', value: 349 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF4444'];

const Dashboard = () => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            style={{ 
              minWidth: 200, 
              borderRadius: 15, 
              backgroundColor: '#800080', 
              color: 'white', 
              padding: '10px',
              margin: '10px', 
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' 
            }}
          >
            <CardContent>
              <Typography variant="h5" component="div" style={{ textAlign: 'center' }}>
                {stat.title}
              </Typography>
              <Typography variant="h3" component="div" style={{ textAlign: 'center', marginTop: '10px' }}>
                {stat.number}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
        <Card style={{ minWidth: 300, borderRadius: 15, padding: '20px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
          <Typography variant="h6" component="div" style={{ textAlign: 'center', marginBottom: '20px' }}>
            Certificates Expiring
          </Typography>
          <BarChart width={300} height={200} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </Card>

        <Card style={{ minWidth: 300, borderRadius: 15, padding: '20px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
          <Typography variant="h6" component="div" style={{ textAlign: 'center', marginBottom: '20px' }}>
            Certificate Authorities
          </Typography>
          <PieChart width={300} height={200}>
            <Pie 
              data={pieData} 
              cx="50%" 
              cy="50%" 
              outerRadius={80} 
              fill="#8884d8" 
              dataKey="value" 
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <Card style={{ minWidth: 600, borderRadius: 15, padding: '20px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
          <Typography variant="h6" component="div" style={{ textAlign: 'center', marginBottom: '20px' }}>
            Certificate Trends
          </Typography>
          <LineChart width={600} height={300} data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
