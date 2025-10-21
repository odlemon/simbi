const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testSearchEndpoint() {
  console.log('🔍 Testing search endpoint with query parameters...\n');

  try {
    // 1. Register and login
    console.log('1️⃣ Registering test buyer...');
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
    
    console.log('✅ Buyer registered');

    // 2. Login
    console.log('\n2️⃣ Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', {
      email,
      password: 'Password123!'
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    console.log('✅ Login successful');

    // 3. Test search with query parameters
    console.log('\n3️⃣ Testing search with query parameters...');
    
    const searchParams = new URLSearchParams({
      q: 'filter',
      make: 'Toyota',
      model: 'Hilux',
      yearFrom: '2015',
      yearTo: '2020',
      category: 'Engine',
      priceMin: '50'
    });
    
    const searchUrl = `${BASE}/products/search?${searchParams.toString()}`;
    console.log('🔗 Search URL:', searchUrl);
    
    const searchResponse = await axios.get(searchUrl, auth);
    
    console.log('\n📊 Search Results:');
    console.log('- Status:', searchResponse.status);
    console.log('- Success:', searchResponse.data.success);
    console.log('- Message:', searchResponse.data.message);
    
    if (searchResponse.data.success) {
      console.log('- Products found:', searchResponse.data.data?.length || 0);
      
      if (searchResponse.data.data && searchResponse.data.data.length > 0) {
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
      }
    } else {
      console.log('❌ Search failed:', searchResponse.data.error);
    }

    console.log('\n🎉 Search endpoint test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSearchEndpoint();
