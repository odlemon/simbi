const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testVinDecodeCorrect() {
  console.log('🚗 Testing VIN decode endpoint CORRECTLY...\n');

  try {
    // 1. Register and login
    console.log('1️⃣ Registering test buyer...');
    const unique = Date.now().toString();
    const email = `vin_test_${unique}@example.com`;
    
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'VIN',
      lastName: 'Test',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    
    console.log('✅ Buyer registered');

    // 2. Login
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', {
      email,
      password: 'Password123!'
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    console.log('✅ Login successful');

    // 3. Test VIN decode with POST and request body
    console.log('\n3️⃣ Testing VIN decode with POST + body...');
    
    const testVin = '1HGBH41JXMN109186'; // Example VIN
    console.log('🔍 Testing VIN:', testVin);
    
    // ✅ CORRECT: POST with request body
    const vinResponse = await axios.post(BASE + '/products/vin-decode', {
      vin: testVin  // ← This is the request body
    }, auth);
    
    console.log('\n📊 VIN Decode Results:');
    console.log('- Status:', vinResponse.status);
    console.log('- Success:', vinResponse.data.success);
    console.log('- Message:', vinResponse.data.message);
    
    if (vinResponse.data.success) {
      console.log('- Products found:', vinResponse.data.data?.length || 0);
      
      if (vinResponse.data.data && vinResponse.data.data.length > 0) {
        const firstProduct = vinResponse.data.data[0];
        console.log('\n📦 First Compatible Product:');
        console.log('- Name:', firstProduct.name);
        console.log('- Make:', firstProduct.make);
        console.log('- Model:', firstProduct.model);
        console.log('- Year:', firstProduct.year);
        console.log('- Display Price:', firstProduct.displayPrice);
        console.log('- Currency:', firstProduct.currency);
      }
    } else {
      console.log('❌ VIN decode failed:', vinResponse.data.error);
    }

    console.log('\n🎉 VIN decode test completed!');
    console.log('\n📝 Note: VIN decode requires POST with request body:');
    console.log('   POST /api/buyer/products/vin-decode');
    console.log('   Body: { "vin": "1HGBH41JXMN109186" }');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testVinDecodeCorrect();
