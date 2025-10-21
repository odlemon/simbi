const axios = require('axios');

async function testConnectionFix() {
  try {
    console.log('🔧 Testing connection fix...');
    
    // Test basic endpoint without authentication first
    try {
      const response = await axios.get('http://localhost:3000/health');
      console.log('✅ Server is running:', response.data.status);
    } catch (error) {
      console.log('❌ Server not responding:', error.message);
      return;
    }
    
    // Test buyer registration (this will use the fixed Prisma connections)
    console.log('🔐 Testing buyer registration...');
    const unique = Date.now().toString();
    const email = 'test_' + unique + '@example.com';
    
    try {
      const registerResponse = await axios.post('http://localhost:3000/api/buyer/auth/register', {
        email,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        buyerType: 'INDIVIDUAL',
        phoneNumber: '+263771234567'
      });
      console.log('✅ Registration successful:', registerResponse.status);
      
      // Test login
      console.log('🔑 Testing login...');
      const loginResponse = await axios.post('http://localhost:3000/api/buyer/auth/login', { 
        email, 
        password: 'Password123!' 
      });
      console.log('✅ Login successful');
      
      const token = loginResponse.data?.data?.accessToken;
      const auth = { headers: { Authorization: 'Bearer ' + token } };
      
      // Test products endpoint (this was failing before)
      console.log('📦 Testing products endpoint...');
      try {
        const productsResponse = await axios.get('http://localhost:3000/api/buyer/products?limit=2', auth);
        console.log('✅ Products endpoint working!');
        console.log('📊 Found products:', productsResponse.data?.data?.length || 0);
      } catch (error) {
        console.log('⚠️ Products endpoint error:', error.response?.data?.message || error.message);
      }
      
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnectionFix();
