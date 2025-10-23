const axios = require('axios');

async function testEndpoint() {
  try {
    console.log('Testing if endpoint exists...');
    
    const response = await axios.get('http://localhost:3000/api/admin/dashboard/comprehensive', {
      timeout: 5000
    });
    
    console.log('Response:', response.status, response.data);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running');
    } else if (error.response) {
      console.log('✅ Endpoint exists, status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testEndpoint();
