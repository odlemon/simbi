const axios = require('axios');

async function testSpendingTrends() {
  console.log('🔍 Testing Spending Trends Endpoint...');
  
  try {
    // 1. Register a buyer
    console.log('\n1️⃣ Registering test buyer...');
    const unique = Date.now().toString();
    const email = `buyer_trends_${unique}@example.com`;
    const password = 'Password123!';
    const phoneNumber = '+263771234567';

    const registerRes = await axios.post('http://localhost:3000/api/buyer/auth/register', {
      email,
      password,
      firstName: 'Trends',
      lastName: 'Test',
      buyerType: 'INDIVIDUAL',
      phoneNumber,
      address: {
        addressLine1: '100 Trends St',
        city: 'TrendsCity',
        province: 'TrendsProvince',
        postalCode: '11111',
        country: 'TestCountry'
      }
    });
    console.log('✅ Buyer registered successfully');

    // 2. Log in
    console.log('\n2️⃣ Logging in...');
    const loginRes = await axios.post('http://localhost:3000/api/buyer/auth/login', { email, password });
    const token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 3. Test spending trends endpoint
    console.log('\n3️⃣ Testing spending trends endpoint...');
    const trendsRes = await axios.get('http://localhost:3000/api/buyer/analytics/spending-trends?period=6months', authHeaders);
    
    console.log('📊 Spending Trends Response:');
    console.log(JSON.stringify(trendsRes.data, null, 2));

    // 4. Test the alternative URL format
    console.log('\n4️⃣ Testing alternative URL format...');
    const trendsRes2 = await axios.get('http://localhost:3000/api/buyer/analytics/spending/trends?period=6months', authHeaders);
    
    console.log('📊 Alternative URL Response:');
    console.log(JSON.stringify(trendsRes2.data, null, 2));

    console.log('\n✅ SUCCESS: Both URL formats are working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSpendingTrends();
