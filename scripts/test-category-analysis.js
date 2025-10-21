const axios = require('axios');

async function testCategoryAnalysis() {
  console.log('🔍 Testing Category Analysis Endpoint...');
  
  try {
    // 1. Register a buyer
    console.log('\n1️⃣ Registering test buyer...');
    const unique = Date.now().toString();
    const email = `buyer_category_${unique}@example.com`;
    const password = 'Password123!';
    const phoneNumber = '+263771234567';

    const registerRes = await axios.post('http://localhost:3000/api/buyer/auth/register', {
      email,
      password,
      firstName: 'Category',
      lastName: 'Test',
      buyerType: 'INDIVIDUAL',
      phoneNumber,
      address: {
        addressLine1: '100 Category St',
        city: 'CategoryCity',
        province: 'CategoryProvince',
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

    // 3. Test category analysis endpoint
    console.log('\n3️⃣ Testing category analysis endpoint...');
    const categoryRes = await axios.get('http://localhost:3000/api/buyer/analytics/category-analysis?dateFrom=2025-01-01&dateTo=2025-12-31', authHeaders);
    
    console.log('📊 Category Analysis Response:');
    console.log(JSON.stringify(categoryRes.data, null, 2));

    console.log('\n✅ SUCCESS: Category analysis endpoint is working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCategoryAnalysis();
