const axios = require('axios');

async function testDashboard() {
  try {
    console.log('🧪 Testing Admin Dashboard...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:3000/api/admin/auth/login', {
      email: 'admin@simbi.com',
      password: 'admin123'
    });
    
    console.log('Login response:', loginResponse.data);
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      
      // Test comprehensive dashboard
      const dashboardResponse = await axios.get('http://localhost:3000/api/admin/dashboard/comprehensive', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Dashboard response:', JSON.stringify(dashboardResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testDashboard();
