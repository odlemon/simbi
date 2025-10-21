const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function simpleOrderTest() {
  console.log('🔍 Simple Order Test...');

  const unique = Date.now().toString();
  const email = `simple_${unique}@test.com`;
  const password = 'Password123!';

  try {
    // 1. Register buyer
    console.log('\n1️⃣ Registering buyer...');
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      firstName: 'Simple',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567',
      address: {
        addressLine1: '123 Test St',
        city: 'Harare',
        province: 'Harare',
        postalCode: '0000',
        country: 'Zimbabwe'
      }
    });
    console.log('✅ Registration successful');

    // 2. Login
    console.log('\n2️⃣ Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 3. Get buyer info
    console.log('\n3️⃣ Getting buyer profile...');
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, authHeaders);
    const buyerId = profileRes.data.data.id;
    console.log('✅ Buyer ID:', buyerId);

    // 4. Create an address (required for orders)
    console.log('\n4️⃣ Creating address...');
    const addressRes = await axios.post(`${BASE_URL}/addresses`, {
      fullName: 'Test Buyer',
      phoneNumber: '+263771234567',
      addressLine1: '123 Test Street',
      city: 'Harare',
      province: 'Harare',
      postalCode: '0000',
      isDefault: true
    }, authHeaders);
    
    const addressId = addressRes.data.data.id;
    console.log('✅ Address created:', addressId);

    // 5. Get products
    console.log('\n5️⃣ Getting products...');
    const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    const products = productsRes.data.data;
    console.log('✅ Products found:', products.length);
    
    if (products.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
    const productId = products[0].id;
    console.log('✅ Using product:', productId);

    // 6. Create order
    console.log('\n6️⃣ Creating order...');
    const orderData = {
      items: [{ productId, quantity: 1 }],
      shippingAddressId: addressId
    };
    
    console.log('📝 Order data:', JSON.stringify(orderData, null, 2));
    
    const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
    console.log('✅ Order created successfully!');
    console.log('📊 Order:', JSON.stringify(orderRes.data, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Error details:', error.response.data.error);
    }
  }
}

simpleOrderTest();
