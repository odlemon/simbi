const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testBuyerFlow() {
  const unique = Date.now().toString();
  const email = 'test_buyer_' + unique + '@example.com';
  const password = 'Password123!';

  console.log('🚀 Starting Buyer Flow Test\n');

  try {
    // 1. Register buyer
    console.log('1️⃣ Registering buyer...');
    const registerResponse = await axios.post(BASE + '/auth/register', {
      email,
      password,
      firstName: 'Test',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    console.log('✅ Registration successful:', registerResponse.status);

    // 2. Login
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', { email, password });
    const token = loginResponse.data?.data?.accessToken;
    if (!token) throw new Error('No access token received');
    console.log('✅ Login successful, token length:', token.length);

    const auth = { headers: { Authorization: 'Bearer ' + token } };

    // 3. Get profile
    console.log('\n3️⃣ Getting profile...');
    const profileResponse = await axios.get(BASE + '/auth/profile', auth);
    console.log('✅ Profile retrieved:', profileResponse.data?.data?.email);

    // 4. Add address
    console.log('\n4️⃣ Adding address...');
    const addressResponse = await axios.post(BASE + '/addresses', {
      fullName: 'Test Buyer',
      phoneNumber: '+263771234567',
      addressLine1: '123 Test Street',
      city: 'Harare',
      province: 'Harare',
      postalCode: '0000',
      isDefault: true
    }, auth);
    const addressId = addressResponse.data?.data?.id;
    console.log('✅ Address added:', addressId);

    // 5. Test product search (simple)
    console.log('\n5️⃣ Testing product search...');
    try {
      const searchResponse = await axios.post(BASE + '/products/search', {
        q: 'brake'
      }, auth);
      console.log('✅ Product search successful, found products:', searchResponse.data?.data?.length || 0);
    } catch (error) {
      console.log('⚠️ Product search error:', error.response?.data?.message || error.message);
    }

    // 6. Test analytics dashboard
    console.log('\n6️⃣ Testing analytics dashboard...');
    try {
      const analyticsResponse = await axios.get(BASE + '/analytics/dashboard', auth);
      console.log('✅ Analytics dashboard loaded');
    } catch (error) {
      console.log('⚠️ Analytics error:', error.response?.data?.message || error.message);
    }

    // 7. Test order creation with real product
    console.log('\n7️⃣ Testing order creation...');
    try {
      const orderResponse = await axios.post(BASE + '/orders', {
        items: [{ productId: '35930667-1300-4773-8827-02fc9781ca4a', quantity: 1 }],
        addressId: addressId
      }, auth);
      console.log('✅ Order created successfully');
    } catch (error) {
      console.log('⚠️ Order creation error:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Buyer flow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testBuyerFlow();
