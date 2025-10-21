const axios = require('axios');

async function testOrderStatusEndpoint() {
  console.log('🧪 Testing Order Status Endpoint...');

  try {
    // First, let's test if the order exists
    console.log('\n1️⃣ Testing GET order details...');
    try {
      const getRes = await axios.get('http://localhost:3000/api/seller/orders/eec6754c-ef09-4955-93a5-14438ece3132', {
        headers: {
          'Authorization': 'Bearer YOUR_SELLER_TOKEN_HERE'
        }
      });
      console.log('✅ Order exists:', getRes.data.success);
    } catch (getError) {
      console.log('❌ Order not found or auth issue:', getError.response?.status, getError.response?.data?.message);
    }

    // Test PATCH method (correct)
    console.log('\n2️⃣ Testing PATCH order status (correct method)...');
    try {
      const patchRes = await axios.patch('http://localhost:3000/api/seller/orders/eec6754c-ef09-4955-93a5-14438ece3132/status', {
        status: 'ACCEPTED'
      }, {
        headers: {
          'Authorization': 'Bearer YOUR_SELLER_TOKEN_HERE',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ PATCH request successful:', patchRes.data);
    } catch (patchError) {
      console.log('❌ PATCH request failed:', patchError.response?.status, patchError.response?.data?.message);
    }

    // Test POST method (incorrect)
    console.log('\n3️⃣ Testing POST order status (incorrect method)...');
    try {
      const postRes = await axios.post('http://localhost:3000/api/seller/orders/eec6754c-ef09-4955-93a5-14438ece3132/status', {
        status: 'ACCEPTED'
      }, {
        headers: {
          'Authorization': 'Bearer YOUR_SELLER_TOKEN_HERE',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST request successful:', postRes.data);
    } catch (postError) {
      console.log('❌ POST request failed (expected):', postError.response?.status, postError.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOrderStatusEndpoint();
