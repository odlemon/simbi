const axios = require('axios');

async function testAddressEndpoint() {
  const BASE = 'http://localhost:3000/api/buyer';
  
  try {
    // 1. Register and login first
    const unique = Date.now().toString();
    const email = 'test_' + unique + '@example.com';
    
    console.log('🔐 Registering buyer...');
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', { 
      email, 
      password: 'Password123!' 
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    
    // 2. Test GET addresses endpoint
    console.log('📍 Testing GET /api/buyer/addresses...');
    const getAddressesResponse = await axios.get(BASE + '/addresses', auth);
    console.log('✅ GET addresses successful:', getAddressesResponse.data);
    
    // 3. Test POST addresses endpoint
    console.log('📍 Testing POST /api/buyer/addresses...');
    const createAddressResponse = await axios.post(BASE + '/addresses', {
      fullName: 'Test User',
      phoneNumber: '+263771234567',
      addressLine1: '123 Test Street',
      city: 'Harare',
      province: 'Harare',
      postalCode: '0000',
      isDefault: true
    }, auth);
    console.log('✅ POST addresses successful:', createAddressResponse.data);
    
    console.log('\n🎉 All address endpoints working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAddressEndpoint();
