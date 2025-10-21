const axios = require('axios');

async function testFixedProducts() {
  const BASE = 'http://localhost:3000/api/buyer';
  
  try {
    console.log('🔐 Registering buyer...');
    const unique = Date.now().toString();
    const email = 'test_' + unique + '@example.com';
    
    const registerResponse = await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    console.log('✅ Registration successful');
    
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', { 
      email, 
      password: 'Password123!' 
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    console.log('✅ Login successful');
    
    console.log('📦 Testing GET /api/buyer/products...');
    try {
      const response = await axios.get(BASE + '/products?limit=3', auth);
      console.log('✅ GET products successful!');
      console.log('📊 Found products:', response.data?.data?.length || 0);
      if (response.data?.data?.length > 0) {
        console.log('🔍 First product:', response.data.data[0].name || 'No name');
      }
    } catch (error) {
      console.log('❌ GET products failed:', error.response?.data?.message || error.message);
    }
    
    console.log('🔍 Testing GET /api/buyer/products/search...');
    try {
      const searchResponse = await axios.get(BASE + '/products/search?q=brake&limit=3', auth);
      console.log('✅ GET search successful!');
      console.log('📊 Found products:', searchResponse.data?.data?.length || 0);
    } catch (error) {
      console.log('❌ GET search failed:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFixedProducts();
