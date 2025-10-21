const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function debugOrderCreation() {
  console.log('🔍 Debugging Order Creation...');

  const unique = Date.now().toString();
  const email = `debug_buyer_${unique}@example.com`;
  const password = 'Password123!';
  const phoneNumber = '+263771234567';

  let token = '';
  let addressId = '';

  try {
    // 1. Register a test buyer
    console.log('\n1️⃣ Registering test buyer...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      firstName: 'Debug',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber,
    });
    console.log('✅ Buyer registered successfully');

    // 2. Log in the test buyer
    console.log('\n2️⃣ Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // 3. Add an address (required for orders)
    console.log('\n3️⃣ Adding address...');
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
    console.log('✅ Address added:', addressId);

    // 4. Get a product to order
    console.log('\n4️⃣ Getting available products...');
    const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    
    if (productsRes.data.data && productsRes.data.data.length > 0) {
      const product = productsRes.data.data[0];
      console.log('📦 Found product:', product.name);
      console.log(`- ID: ${product.id}`);
      console.log(`- Price: ${product.displayPrice} ${product.currency}`);

      // 5. Create order with debugging
      console.log('\n5️⃣ Creating order with debugging...');
      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: 1
          }
        ],
        shippingAddressId: addressId,
        poNumber: `PO-DEBUG-${unique}`,
        notes: 'Debug order'
      };

      console.log('📝 Order data:', JSON.stringify(orderData, null, 2));

      const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
      console.log('✅ Order created successfully!');
      console.log('📊 Order Details:', JSON.stringify(orderRes.data, null, 2));
    } else {
      console.log('❌ No products found');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Error details:', error.response.data.error);
    }
  }
}

debugOrderCreation();
