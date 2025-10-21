const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/seller';
const BUYER_URL = 'http://localhost:3000/api/buyer';

async function testSellerOrders() {
  console.log('🧪 Testing Seller Order Management...');

  let sellerToken = '';
  let buyerToken = '';
  let orderId = '';

  try {
    // 1. Login as seller
    console.log('\n1️⃣ Logging in as seller...');
    const sellerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'nyashakarata1@gmail.com',
      password: 'Password123!'
    });
    sellerToken = sellerLoginRes.data.data.accessToken;
    console.log('✅ Seller login successful');

    // 2. Login as buyer
    console.log('\n2️⃣ Logging in as buyer...');
    const buyerLoginRes = await axios.post(`${BUYER_URL}/auth/login`, {
      email: 'buyer@example.com',
      password: 'Password123!'
    });
    buyerToken = buyerLoginRes.data.data.accessToken;
    console.log('✅ Buyer login successful');

    const sellerHeaders = { headers: { Authorization: `Bearer ${sellerToken}` } };
    const buyerHeaders = { headers: { Authorization: `Bearer ${buyerToken}` } };

    // 3. Create an order as buyer (if needed)
    console.log('\n3️⃣ Creating order as buyer...');
    try {
      // First check if buyer has addresses
      const addressesRes = await axios.get(`${BUYER_URL}/addresses`, buyerHeaders);
      let addressId;
      
      if (addressesRes.data.data.length === 0) {
        // Create address
        const addressRes = await axios.post(`${BUYER_URL}/addresses`, {
          fullName: 'Test Buyer',
          phoneNumber: '+263771234567',
          addressLine1: '123 Test Street',
          city: 'Harare',
          province: 'Harare',
          postalCode: '0000',
          isDefault: true
        }, buyerHeaders);
        addressId = addressRes.data.data.id;
      } else {
        addressId = addressesRes.data.data[0].id;
      }

      // Get products
      const productsRes = await axios.get(`${BUYER_URL}/products`, buyerHeaders);
      const productId = productsRes.data.data[0].id;

      // Create order
      const orderRes = await axios.post(`${BUYER_URL}/orders`, {
        items: [{ productId, quantity: 1 }],
        shippingAddressId: addressId
      }, buyerHeaders);
      
      orderId = orderRes.data.data.id;
      console.log('✅ Order created:', orderId);
    } catch (orderError) {
      console.log('⚠️ Could not create new order, using existing order');
      // Try to get existing orders
      try {
        const existingOrdersRes = await axios.get(`${BASE_URL}/orders`, sellerHeaders);
        if (existingOrdersRes.data.data.length > 0) {
          orderId = existingOrdersRes.data.data[0].id;
          console.log('✅ Using existing order:', orderId);
        } else {
          console.log('❌ No orders found');
          return;
        }
      } catch (existingError) {
        console.log('❌ Could not get existing orders');
        return;
      }
    }

    // 4. Test seller order endpoints
    console.log('\n4️⃣ Testing seller order endpoints...');

    // Get all orders
    console.log('\n📋 Getting all orders...');
    const ordersRes = await axios.get(`${BASE_URL}/orders`, sellerHeaders);
    console.log('✅ Orders retrieved:', ordersRes.data.data.length);

    // Get order statistics
    console.log('\n📊 Getting order statistics...');
    const statsRes = await axios.get(`${BASE_URL}/orders/statistics`, sellerHeaders);
    console.log('✅ Statistics:', JSON.stringify(statsRes.data.data, null, 2));

    // Get order details
    if (orderId) {
      console.log('\n🔍 Getting order details...');
      const detailsRes = await axios.get(`${BASE_URL}/orders/${orderId}`, sellerHeaders);
      console.log('✅ Order details retrieved');
      console.log('📦 Order:', detailsRes.data.data.orderNumber);
      console.log('👤 Buyer:', detailsRes.data.data.buyer.firstName, detailsRes.data.data.buyer.lastName);
      console.log('💰 Total:', detailsRes.data.data.totalAmount, detailsRes.data.data.currency);

      // Test accepting order
      console.log('\n✅ Testing order acceptance...');
      try {
        const acceptRes = await axios.patch(`${BASE_URL}/orders/${orderId}/status`, {
          status: 'ACCEPTED'
        }, sellerHeaders);
        console.log('✅ Order accepted successfully');
      } catch (acceptError) {
        console.log('⚠️ Order acceptance failed (might already be processed):', acceptError.response?.data?.message);
      }

      // Test marking as shipped
      console.log('\n🚚 Testing order shipment...');
      try {
        const shipRes = await axios.patch(`${BASE_URL}/orders/${orderId}/fulfillment`, {
          status: 'SHIPPED',
          trackingNumber: 'TRK123456789',
          estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, sellerHeaders);
        console.log('✅ Order marked as shipped');
      } catch (shipError) {
        console.log('⚠️ Order shipment failed:', shipError.response?.data?.message);
      }
    }

    console.log('\n🎉 Seller order management test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSellerOrders();
