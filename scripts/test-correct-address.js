const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function testCorrectAddress() {
  console.log('🔍 Testing with Correct Address ID...');

  const unique = Date.now().toString();
  const email = `correct_${unique}@test.com`;
  const password = 'Password123!';

  try {
    // 1. Register and login
    console.log('\n1️⃣ Registering buyer...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      firstName: 'Correct',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const token = loginRes.data.data.accessToken;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Get products
    console.log('\n2️⃣ Getting products...');
    const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    const productId = productsRes.data.data[0].id;
    console.log('✅ Product ID:', productId);

    // 3. Test with the CORRECT address ID (with 9 at the beginning)
    console.log('\n3️⃣ Testing with CORRECT address ID...');
    const correctAddressId = '9df63d66-b682-463f-b669-da356f5476a9';
    
    const orderData = {
      items: [{ productId, quantity: 1 }],
      shippingAddressId: correctAddressId
    };
    
    console.log('📝 Using CORRECT address ID:', correctAddressId);
    console.log('📝 Order data:', JSON.stringify(orderData, null, 2));
    
    const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
    console.log('✅ Order created successfully with CORRECT address ID!');
    console.log('📊 Order ID:', orderRes.data.data.id);

    // 4. Test with the INCORRECT address ID (missing 9)
    console.log('\n4️⃣ Testing with INCORRECT address ID (missing 9)...');
    const incorrectAddressId = 'df63d66-b682-463f-b669-da356f5476a9';
    
    const incorrectOrderData = {
      items: [{ productId, quantity: 1 }],
      shippingAddressId: incorrectAddressId
    };
    
    console.log('📝 Using INCORRECT address ID:', incorrectAddressId);
    
    try {
      const incorrectOrderRes = await axios.post(`${BASE_URL}/orders`, incorrectOrderData, authHeaders);
      console.log('❌ This should not have worked!');
    } catch (incorrectError) {
      console.log('✅ Correctly failed with INCORRECT address ID:');
      console.log('   Error:', incorrectError.response?.data?.message || incorrectError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCorrectAddress();
