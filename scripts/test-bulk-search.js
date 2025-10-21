const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testBulkSearch() {
  console.log('🔍 Testing Bulk Search Endpoint...\n');

  try {
    // 1. Register and login
    console.log('1️⃣ Setting up authentication...');
    const unique = Date.now().toString();
    const email = `bulk_test_${unique}@example.com`;
    
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Bulk',
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

    // 2. Test bulk search
    console.log('\n2️⃣ Testing bulk search...');
    
    const bulkSearchData = {
      partNumbers: ["BP-12345", "FL-67890", "SP-11111"],
      limit: 50
    };
    
    console.log('🔍 Searching for parts:', bulkSearchData.partNumbers);
    
    const bulkResponse = await axios.post(BASE + '/products/bulk-search', bulkSearchData, auth);
    
    console.log('\n📊 Bulk Search Results:');
    console.log('- Status:', bulkResponse.status);
    console.log('- Success:', bulkResponse.data.success);
    console.log('- Message:', bulkResponse.data.message);
    
    if (bulkResponse.data.success) {
      const data = bulkResponse.data.data;
      console.log('- Found products:', data.found?.length || 0);
      console.log('- Not found parts:', data.notFound?.length || 0);
      console.log('- Total results:', data.total || 0);
      
      if (data.found && data.found.length > 0) {
        console.log('\n📦 First Found Product:');
        const firstProduct = data.found[0];
        console.log('- Name:', firstProduct.name);
        console.log('- OEM Part Number:', firstProduct.oemPartNumber);
        console.log('- Display Price:', firstProduct.displayPrice);
        console.log('- Currency:', firstProduct.currency);
        console.log('- In Stock:', firstProduct.inStock);
      }
      
      if (data.notFound && data.notFound.length > 0) {
        console.log('\n❌ Not Found Parts:', data.notFound);
      }
    } else {
      console.log('❌ Bulk search failed:', bulkResponse.data.error);
    }

    console.log('\n🎉 Bulk search test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBulkSearch();
