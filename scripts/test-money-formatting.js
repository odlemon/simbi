const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';

async function testMoneyFormatting() {
  console.log('💰 Testing money formatting...\n');

  try {
    // 1. Register and login
    console.log('1️⃣ Registering test buyer...');
    const unique = Date.now().toString();
    const email = `money_test_${unique}@example.com`;
    
    await axios.post(BASE + '/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Money',
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

    // 3. Test product search with money formatting
    console.log('\n3️⃣ Testing money formatting...');
    const searchResponse = await axios.get(BASE + '/products', auth);
    
    if (searchResponse.data.success && searchResponse.data.data.length > 0) {
      const product = searchResponse.data.data[0];
      
      console.log('📊 Money Formatting Results:');
      console.log('- Display Price:', product.displayPrice);
      console.log('- Lowest Price:', product.lowestPrice);
      console.log('- Commission:', product.commission);
      console.log('- Currency:', product.currency);
      
      // Check if prices are properly rounded
      const displayPriceRounded = Math.round(product.displayPrice * 100) / 100;
      const commissionRounded = Math.round(product.commission * 100) / 100;
      
      console.log('\n🔍 Rounding Check:');
      console.log('- Display Price matches rounded:', product.displayPrice === displayPriceRounded);
      console.log('- Commission matches rounded:', product.commission === commissionRounded);
      
      if (product.displayPrice === displayPriceRounded && product.commission === commissionRounded) {
        console.log('\n✅ Money formatting is working correctly!');
        console.log('✅ No floating-point precision issues detected');
      } else {
        console.log('\n❌ Money formatting issues detected');
        console.log('❌ Floating-point precision problems still exist');
      }
    } else {
      console.log('❌ No products found to test money formatting');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMoneyFormatting();
