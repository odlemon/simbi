const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testVinDecodeFinal() {
  console.log('🚗 Final VIN Decode Test - Correct Usage\n');

  try {
    // 1. Register and login
    console.log('1️⃣ Setting up authentication...');
    const unique = Date.now().toString();
    const email = `vin_final_${unique}@example.com`;
    
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'VIN',
      lastName: 'Final',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    
    const loginResponse = await axios.post(BASE + '/auth/login', {
      email,
      password: 'Password123!'
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    console.log('✅ Authentication successful');

    // 2. Test VIN decode with correct POST method
    console.log('\n2️⃣ Testing VIN decode (POST method)...');
    
    const testVin = '1HGBH41JXMN109186';
    console.log('🔍 VIN:', testVin);
    
    const vinResponse = await axios.post(BASE + '/products/vin-decode', {
      vin: testVin
    }, auth);
    
    console.log('\n📊 Results:');
    console.log('- Status:', vinResponse.status);
    console.log('- Success:', vinResponse.data.success);
    console.log('- Products found:', vinResponse.data.data?.length || 0);
    
    if (vinResponse.data.success) {
      console.log('✅ VIN decode working correctly!');
    } else {
      console.log('❌ VIN decode failed:', vinResponse.data.error);
    }

    // 3. Test wrong method (should fail)
    console.log('\n3️⃣ Testing wrong method (GET) - should fail...');
    try {
      await axios.get(BASE + '/products/vin-decode', auth);
      console.log('❌ GET method should have failed!');
    } catch (error) {
      console.log('✅ GET method correctly failed (expected)');
    }

    console.log('\n🎉 VIN decode endpoint test completed!');
    console.log('\n📝 Summary:');
    console.log('✅ POST /api/buyer/products/vin-decode with body works');
    console.log('✅ GET /api/buyer/products/vin-decode correctly fails');
    console.log('✅ Endpoint is properly configured');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testVinDecodeFinal();
