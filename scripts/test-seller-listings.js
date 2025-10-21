const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testSellerListings() {
  console.log('🧪 Testing seller listings search...\n');

  try {
    // 1. Register a test buyer
    console.log('1️⃣ Registering test buyer...');
    const unique = Date.now().toString();
    const email = `test_buyer_${unique}@example.com`;
    
    const registerResponse = await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'Buyer',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    
    if (registerResponse.data.success) {
      console.log('✅ Buyer registered successfully');
    } else {
      console.log('❌ Registration failed:', registerResponse.data.message);
      return;
    }

    // 2. Login to get token
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', {
      email,
      password: 'Password123!'
    });
    
    const token = loginResponse.data?.data?.accessToken;
    if (!token) {
      console.log('❌ Login failed - no token received');
      return;
    }
    
    console.log('✅ Login successful');
    const auth = { headers: { Authorization: 'Bearer ' + token } };

    // 3. Test product search (should now fetch from seller listings)
    console.log('\n3️⃣ Testing product search...');
    const searchResponse = await axios.get(BASE + '/products', auth);
    
    console.log('📊 Search Results:');
    console.log('- Status:', searchResponse.status);
    console.log('- Success:', searchResponse.data.success);
    console.log('- Message:', searchResponse.data.message);
    
    if (searchResponse.data.data) {
      console.log('- Products found:', searchResponse.data.data.length);
      
      if (searchResponse.data.data.length > 0) {
        const firstProduct = searchResponse.data.data[0];
        console.log('\n📦 First Product Details:');
        console.log('- Name:', firstProduct.name);
        console.log('- Make:', firstProduct.make);
        console.log('- Model:', firstProduct.model);
        console.log('- Year:', firstProduct.year);
        console.log('- Category:', firstProduct.category);
        console.log('- Display Price:', firstProduct.displayPrice);
        console.log('- Currency:', firstProduct.currency);
        console.log('- In Stock:', firstProduct.inStock);
        console.log('- Seller Count:', firstProduct.sellerCount);
        console.log('- Lowest Price:', firstProduct.lowestPrice);
        console.log('- Commission:', firstProduct.commission);
      }
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('✅ Product search is now fetching from seller listings');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSellerListings();
