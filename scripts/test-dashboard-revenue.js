const axios = require('axios');

async function testDashboardRevenue() {
  console.log('🔍 Testing Dashboard Revenue Fix...');
  
  try {
    // 1. Login as seller to get fresh token
    console.log('\n1️⃣ Logging in as seller...');
    const loginRes = await axios.post('http://localhost:3000/api/seller/auth/login', {
      email: 'nyashakarata1@gmail.com',
      password: 'Password123!'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('✅ Login successful');
    
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    
    // 2. Get dashboard stats
    console.log('\n2️⃣ Getting dashboard stats...');
    const statsRes = await axios.get('http://localhost:3000/api/seller/dashboard/stats', authHeaders);
    
    console.log('📊 Dashboard Stats:');
    console.log(JSON.stringify(statsRes.data, null, 2));
    
    // 3. Check if revenue is now showing correctly
    const revenue = statsRes.data.data.financial.totalRevenue;
    if (revenue > 0) {
      console.log(`\n✅ SUCCESS: Revenue is now showing: $${revenue}`);
    } else {
      console.log(`\n❌ ISSUE: Revenue is still 0. Let's check the orders...`);
      
      // 4. Check order statistics for comparison
      console.log('\n3️⃣ Getting order statistics for comparison...');
      const orderStatsRes = await axios.get('http://localhost:3000/api/seller/orders/statistics', authHeaders);
      console.log('📈 Order Statistics:');
      console.log(JSON.stringify(orderStatsRes.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDashboardRevenue();
