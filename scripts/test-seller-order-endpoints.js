const axios = require('axios');

async function testSellerOrderEndpoints() {
  console.log('🧪 Testing Seller Order Endpoints...');

  try {
    // Test if server is responding
    console.log('\n1️⃣ Testing server health...');
    const healthRes = await axios.get('http://localhost:3000/api/seller/orders');
    console.log('✅ Server is responding');
    console.log('📊 Response:', healthRes.status, healthRes.statusText);
    
    if (healthRes.data) {
      console.log('📋 Data:', JSON.stringify(healthRes.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('✅ Endpoint exists but requires authentication (expected)');
    } else if (error.response?.status === 404) {
      console.log('❌ Endpoint not found - server might not be running properly');
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.response?.statusText);
    }
  }
}

testSellerOrderEndpoints();
