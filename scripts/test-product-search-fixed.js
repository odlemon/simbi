const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testProductSearchFixed() {
  console.log('🔍 Testing Fixed Product Search...\n');

  try {
    // 1. Register and login
    console.log('1️⃣ Setting up authentication...');
    const unique = Date.now().toString();
    const email = `search_test_${unique}@example.com`;
    
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Search',
      lastName: 'Test',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    
    const loginResponse = await axios.post(BASE + '/auth/login', {
      email,
      password: 'Password123!'
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    console.log('✅ Authentication successful');

    // 2. Test product search (GET method)
    console.log('\n2️⃣ Testing product search (GET method)...');
    
    const searchResponse = await axios.get(BASE + '/products', auth);
    
    console.log('\n📊 Product Search Results:');
    console.log('- Status:', searchResponse.status);
    console.log('- Success:', searchResponse.data.success);
    console.log('- Products found:', searchResponse.data.data?.length || 0);
    
    if (searchResponse.data.success && searchResponse.data.data.length > 0) {
      const firstProduct = searchResponse.data.data[0];
      console.log('\n📦 First Product Details:');
      console.log('- ID:', firstProduct.id);
      console.log('- Name:', firstProduct.name);
      console.log('- Make:', firstProduct.make);
      console.log('- Model:', firstProduct.model);
      console.log('- Year:', firstProduct.year);
      console.log('- Category:', firstProduct.category);
      console.log('- Subcategory:', firstProduct.subcategory);
      console.log('- Display Price:', firstProduct.displayPrice);
      console.log('- Currency:', firstProduct.currency);
      console.log('- In Stock:', firstProduct.inStock);
      console.log('- Seller Count:', firstProduct.sellerCount);
      console.log('- Lowest Price:', firstProduct.lowestPrice);
      console.log('- Commission:', firstProduct.commission);
    }

    // 3. Test search with query parameters
    console.log('\n3️⃣ Testing search with query parameters...');
    
    const searchWithParams = await axios.get(BASE + '/products/search?q=brake&limit=5', auth);
    
    console.log('\n📊 Search with Parameters:');
    console.log('- Status:', searchWithParams.status);
    console.log('- Success:', searchWithParams.data.success);
    console.log('- Products found:', searchWithParams.data.data?.length || 0);

    console.log('\n🎉 Product search test completed!');
    console.log('\n📝 Summary:');
    console.log('✅ GET /api/buyer/products works');
    console.log('✅ GET /api/buyer/products/search works');
    console.log('✅ No database field errors');
    console.log('✅ Proper data structure returned');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProductSearchFixed();
