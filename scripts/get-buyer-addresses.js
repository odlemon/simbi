const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function getBuyerAddresses() {
  console.log('🔍 Getting Addresses for Current Buyer...');

  const unique = Date.now().toString();
  const email = `buyer_${unique}@test.com`;
  const password = 'Password123!';

  try {
    // 1. Register and login
    console.log('\n1️⃣ Registering buyer...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      firstName: 'Current',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });

    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const token = loginRes.data.data.accessToken;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Get buyer profile
    console.log('\n2️⃣ Getting buyer profile...');
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, authHeaders);
    const buyerId = profileRes.data.data.id;
    console.log('✅ Current Buyer ID:', buyerId);

    // 3. Get addresses for this buyer
    console.log('\n3️⃣ Getting addresses for this buyer...');
    const addressesRes = await axios.get(`${BASE_URL}/addresses`, authHeaders);
    const addresses = addressesRes.data.data;
    console.log('📋 Addresses for this buyer:', addresses.length);
    
    if (addresses.length === 0) {
      console.log('❌ No addresses found. Creating one...');
      
      // Create an address
      const addressRes = await axios.post(`${BASE_URL}/addresses`, {
        fullName: 'Current Buyer',
        phoneNumber: '+263771234567',
        addressLine1: '123 Current Street',
        city: 'Harare',
        province: 'Harare',
        postalCode: '0000',
        isDefault: true
      }, authHeaders);
      
      const newAddressId = addressRes.data.data.id;
      console.log('✅ New address created:', newAddressId);
      
      // Now get addresses again
      const newAddressesRes = await axios.get(`${BASE_URL}/addresses`, authHeaders);
      const newAddresses = newAddressesRes.data.data;
      console.log('📋 Updated addresses:', newAddresses.length);
      
      addresses.push(...newAddresses);
    }
    
    // Display all addresses
    addresses.forEach((addr, index) => {
      console.log(`\n  ${index + 1}. Address ID: ${addr.id}`);
      console.log(`     Name: ${addr.fullName}`);
      console.log(`     Buyer ID: ${addr.buyerId}`);
      console.log(`     City: ${addr.city}`);
      console.log(`     Is Default: ${addr.isDefault}`);
    });

    // 4. Test order creation with the first address
    if (addresses.length > 0) {
      console.log('\n4️⃣ Testing order creation with first address...');
      const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
      const productId = productsRes.data.data[0].id;
      
      const orderData = {
        items: [{ productId, quantity: 1 }],
        shippingAddressId: addresses[0].id
      };
      
      console.log('📝 Using address ID:', addresses[0].id);
      console.log('📝 Buyer ID:', buyerId);
      
      const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
      console.log('✅ Order created successfully!');
      console.log('📊 Order ID:', orderRes.data.data.id);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

getBuyerAddresses();
