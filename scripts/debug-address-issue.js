const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function debugAddressIssue() {
  console.log('🔍 Debugging Address Issue...');

  const unique = Date.now().toString();
  const email = `debug_${unique}@test.com`;
  const password = 'Password123!';

  try {
    // 1. Register buyer
    console.log('\n1️⃣ Registering buyer...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      firstName: 'Debug',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    console.log('✅ Registration successful');

    // 2. Login
    console.log('\n2️⃣ Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 3. Get buyer profile
    console.log('\n3️⃣ Getting buyer profile...');
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, authHeaders);
    const buyerId = profileRes.data.data.id;
    console.log('✅ Buyer ID:', buyerId);

    // 4. Check existing addresses
    console.log('\n4️⃣ Checking existing addresses...');
    const addressesRes = await axios.get(`${BASE_URL}/addresses`, authHeaders);
    const addresses = addressesRes.data.data;
    console.log('📋 Existing addresses:', addresses.length);
    
    addresses.forEach((addr, index) => {
      console.log(`  ${index + 1}. ID: ${addr.id}`);
      console.log(`     Name: ${addr.fullName}`);
      console.log(`     Buyer ID: ${addr.buyerId}`);
      console.log(`     City: ${addr.city}`);
      console.log('');
    });

    // 5. Create a new address if none exist
    let addressId;
    if (addresses.length === 0) {
      console.log('\n5️⃣ Creating new address...');
      const addressRes = await axios.post(`${BASE_URL}/addresses`, {
        fullName: 'Debug Buyer',
        phoneNumber: '+263771234567',
        addressLine1: '123 Debug Street',
        city: 'Harare',
        province: 'Harare',
        postalCode: '0000',
        isDefault: true
      }, authHeaders);
      
      addressId = addressRes.data.data.id;
      console.log('✅ Address created:', addressId);
    } else {
      addressId = addresses[0].id;
      console.log('✅ Using existing address:', addressId);
    }

    // 6. Get products
    console.log('\n6️⃣ Getting products...');
    const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    const products = productsRes.data.data;
    console.log('✅ Products found:', products.length);
    
    if (products.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
    const productId = products[0].id;
    console.log('✅ Using product:', productId);

    // 7. Try to create order
    console.log('\n7️⃣ Creating order...');
    const orderData = {
      items: [{ productId, quantity: 1 }],
      shippingAddressId: addressId
    };
    
    console.log('📝 Order data:', JSON.stringify(orderData, null, 2));
    console.log('🔍 Buyer ID from profile:', buyerId);
    console.log('🔍 Address ID being used:', addressId);
    
    const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
    console.log('✅ Order created successfully!');
    console.log('📊 Order:', JSON.stringify(orderRes.data, null, 2));

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Error details:', error.response.data.error);
    }
    
    // If it's an address error, let's check what addresses exist
    if (error.response?.data?.error?.includes('Address') && error.response?.data?.error?.includes('not found')) {
      console.log('\n🔍 Let me check what addresses exist in the database...');
      try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
        const token = loginRes.data.data.accessToken;
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        
        const addressesRes = await axios.get(`${BASE_URL}/addresses`, authHeaders);
        console.log('📋 All addresses for this buyer:', JSON.stringify(addressesRes.data, null, 2));
      } catch (checkError) {
        console.error('❌ Could not check addresses:', checkError.message);
      }
    }
  }
}

debugAddressIssue();
