const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function checkSpecificAddress() {
  console.log('🔍 Checking Specific Address Issue...');

  const unique = Date.now().toString();
  const email = `check_${unique}@test.com`;
  const password = 'Password123!';

  try {
    // 1. Register and login
    console.log('\n1️⃣ Registering buyer...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      firstName: 'Check',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const token = loginRes.data.data.accessToken;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Get buyer profile
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, authHeaders);
    const buyerId = profileRes.data.data.id;
    console.log('✅ Buyer ID:', buyerId);

    // 3. Create an address
    console.log('\n2️⃣ Creating address...');
    const addressRes = await axios.post(`${BASE_URL}/addresses`, {
      fullName: 'Check Buyer',
      phoneNumber: '+263771234567',
      addressLine1: '123 Check Street',
      city: 'Harare',
      province: 'Harare',
      postalCode: '0000',
      isDefault: true
    }, authHeaders);
    
    const addressId = addressRes.data.data.id;
    console.log('✅ Address created:', addressId);

    // 4. List all addresses to see what exists
    console.log('\n3️⃣ Listing all addresses...');
    const addressesRes = await axios.get(`${BASE_URL}/addresses`, authHeaders);
    const addresses = addressesRes.data.data;
    console.log('📋 All addresses for this buyer:');
    addresses.forEach((addr, index) => {
      console.log(`  ${index + 1}. ID: ${addr.id}`);
      console.log(`     Name: ${addr.fullName}`);
      console.log(`     Buyer ID: ${addr.buyerId}`);
      console.log(`     City: ${addr.city}`);
      console.log('');
    });

    // 5. Try to create order with the new address
    console.log('\n4️⃣ Creating order with new address...');
    const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    const productId = productsRes.data.data[0].id;
    
    const orderData = {
      items: [{ productId, quantity: 1 }],
      shippingAddressId: addressId
    };
    
    console.log('📝 Using address ID:', addressId);
    console.log('📝 Buyer ID:', buyerId);
    
    const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
    console.log('✅ Order created successfully!');
    console.log('📊 Order ID:', orderRes.data.data.id);

    // 6. Now try with the problematic address ID
    console.log('\n5️⃣ Testing with problematic address ID...');
    const problematicAddressId = 'df63d66-b682-463f-b669-da356f5476a9';
    
    try {
      const problematicOrderData = {
        items: [{ productId, quantity: 1 }],
        shippingAddressId: problematicAddressId
      };
      
      console.log('📝 Trying with problematic address ID:', problematicAddressId);
      const problematicOrderRes = await axios.post(`${BASE_URL}/orders`, problematicOrderData, authHeaders);
      console.log('✅ Problematic address worked!');
    } catch (problematicError) {
      console.log('❌ Problematic address failed as expected:');
      console.log('   Error:', problematicError.response?.data?.message || problematicError.message);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
  }
}

checkSpecificAddress();
