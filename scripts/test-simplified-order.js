const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function testSimplifiedOrder() {
  console.log('🧪 Testing Simplified Order Creation...');

  const unique = Date.now().toString();
  const email = `test_buyer_${unique}@example.com`;
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
      firstName: 'Test',
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
      fullName: 'Test Buyer',
      phoneNumber: '+263771234567',
      addressLine1: '123 Test Street',
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
      console.log(`- In Stock: ${product.inStock}`);

      // 5. Create order with simplified structure (NO sellerId needed!)
      console.log('\n5️⃣ Creating order with simplified structure...');
      const orderData = {
        items: [
          {
            productId: product.id, // Only productId and quantity needed!
            quantity: 2
          }
        ],
        shippingAddressId: addressId,
        poNumber: `PO-${unique}`,
        costCenter: 'MAINTENANCE',
        notes: 'Test order with simplified API'
      };

      console.log('📝 Order data:', JSON.stringify(orderData, null, 2));

      try {
        const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, authHeaders);
        console.log('✅ Order created successfully!');
        console.log('📊 Order Details:');
        console.log(`- Order ID: ${orderRes.data.data.id}`);
        console.log(`- Order Number: ${orderRes.data.data.orderNumber}`);
        console.log(`- Total Amount: ${orderRes.data.data.totalAmount}`);
        console.log(`- Status: ${orderRes.data.data.status}`);
      } catch (error) {
        console.log('❌ Order creation failed:');
        console.log(`- Status: ${error.response?.status}`);
        console.log(`- Message: ${error.response?.data?.message}`);
        console.log(`- Error: ${error.response?.data?.error}`);
      }
    } else {
      console.log('❌ No products found');
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSimplifiedOrder();
