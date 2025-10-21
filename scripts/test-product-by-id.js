const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/buyer';

async function testProductById() {
  console.log('🧪 Testing Product by ID endpoint...');

  const unique = Date.now().toString();
  const email = `test_buyer_${unique}@example.com`;
  const password = 'Password123!';
  const phoneNumber = '+263771234567';

  let token = '';

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

    // 3. First get all products to see what IDs are available
    console.log('\n3️⃣ Getting all products to find available IDs...');
    const allProductsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    
    if (allProductsRes.data.data && allProductsRes.data.data.length > 0) {
      const firstProduct = allProductsRes.data.data[0];
      console.log('📦 First Product from search:');
      console.log(`- ID: ${firstProduct.id}`);
      console.log(`- Name: ${firstProduct.name}`);
      console.log(`- Make: ${firstProduct.make}`);
      console.log(`- Model: ${firstProduct.model}`);
      
      // 4. Test the specific product ID endpoint
      console.log('\n4️⃣ Testing product by ID endpoint...');
      const productId = firstProduct.id;
      console.log(`🔍 Testing with ID: ${productId}`);
      
      try {
        const productRes = await axios.get(`${BASE_URL}/products/${productId}`, authHeaders);
        console.log('✅ Product by ID successful!');
        console.log('📊 Product Details:');
        console.log(`- Name: ${productRes.data.data.name}`);
        console.log(`- Display Price: ${productRes.data.data.displayPrice}`);
        console.log(`- Currency: ${productRes.data.data.currency}`);
        console.log(`- In Stock: ${productRes.data.data.inStock}`);
      } catch (error) {
        console.log('❌ Product by ID failed:');
        console.log(`- Status: ${error.response?.status}`);
        console.log(`- Message: ${error.response?.data?.message}`);
        console.log(`- Error: ${error.response?.data?.error}`);
      }
    } else {
      console.log('❌ No products found in search results');
    }

    // 5. Test with the specific ID from the user
    console.log('\n5️⃣ Testing with user-provided ID...');
    const userProvidedId = '35930667-1300-4773-8827-02fc9781ca4a';
    console.log(`🔍 Testing with ID: ${userProvidedId}`);
    
    try {
      const userProductRes = await axios.get(`${BASE_URL}/products/${userProvidedId}`, authHeaders);
      console.log('✅ User-provided ID found!');
      console.log('📊 Product Details:');
      console.log(`- Name: ${userProductRes.data.data.name}`);
      console.log(`- Display Price: ${userProductRes.data.data.displayPrice}`);
    } catch (error) {
      console.log('❌ User-provided ID not found:');
      console.log(`- Status: ${error.response?.status}`);
      console.log(`- Message: ${error.response?.data?.message}`);
      console.log(`- Error: ${error.response?.data?.error}`);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProductById();
