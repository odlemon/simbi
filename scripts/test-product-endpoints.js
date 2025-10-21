const axios = require('axios');

async function testProductEndpoints() {
  const BASE = 'http://localhost:3000/api/buyer';
  
  try {
    // 1. Register and login first
    const unique = Date.now().toString();
    const email = 'test_' + unique + '@example.com';
    
    console.log('🔐 Registering buyer...');
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      buyerType: 'INDIVIDUAL',
      phoneNumber: '+263771234567'
    });
    
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post(BASE + '/auth/login', { 
      email, 
      password: 'Password123!' 
    });
    
    const token = loginResponse.data?.data?.accessToken;
    const auth = { headers: { Authorization: 'Bearer ' + token } };
    
    // 2. Test GET all products
    console.log('📦 Testing GET /api/buyer/products...');
    try {
      const allProductsResponse = await axios.get(BASE + '/products?limit=5', auth);
      console.log('✅ GET all products successful:', allProductsResponse.data?.data?.length || 0, 'products found');
    } catch (error) {
      console.log('⚠️ GET all products error:', error.response?.data?.message || error.message);
    }
    
    // 3. Test GET products with search
    console.log('🔍 Testing GET /api/buyer/products/search...');
    try {
      const searchResponse = await axios.get(BASE + '/products/search?q=brake&limit=5', auth);
      console.log('✅ GET search products successful:', searchResponse.data?.data?.length || 0, 'products found');
    } catch (error) {
      console.log('⚠️ GET search products error:', error.response?.data?.message || error.message);
    }
    
    // 4. Test GET products with filters
    console.log('🔍 Testing GET /api/buyer/products/search with filters...');
    try {
      const filterResponse = await axios.get(BASE + '/products/search?category=Engine&inStock=true&limit=5', auth);
      console.log('✅ GET filtered products successful:', filterResponse.data?.data?.length || 0, 'products found');
    } catch (error) {
      console.log('⚠️ GET filtered products error:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Product endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testProductEndpoints();
