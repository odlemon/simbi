const axios = require('axios');

async function testCashPaymentSystem() {
  try {
    console.log('🔍 Testing Cash Payment System...\n');

    // Step 1: Login as seller
    console.log('1. Logging in as seller...');
    const sellerLoginResponse = await axios.post('http://localhost:3000/api/seller/auth/login', {
      email: 'seller@example.com',
      password: 'password123'
    });

    if (!sellerLoginResponse.data.success) {
      throw new Error('Seller login failed: ' + sellerLoginResponse.data.message);
    }

    const sellerToken = sellerLoginResponse.data.data.token;
    console.log('✅ Seller login successful\n');

    // Step 2: Login as buyer
    console.log('2. Logging in as buyer...');
    const buyerLoginResponse = await axios.post('http://localhost:3000/api/buyer/auth/login', {
      email: 'buyer@example.com',
      password: 'password123'
    });

    if (!buyerLoginResponse.data.success) {
      throw new Error('Buyer login failed: ' + buyerLoginResponse.data.message);
    }

    const buyerToken = buyerLoginResponse.data.data.token;
    console.log('✅ Buyer login successful\n');

    // Step 3: Create an order as buyer
    console.log('3. Creating order as buyer...');
    const orderResponse = await axios.post('http://localhost:3000/api/buyer/orders', {
      items: [
        {
          productId: 'test-product-id', // This would be a real product ID
          quantity: 2
        }
      ],
      shippingAddressId: 'test-address-id' // This would be a real address ID
    }, {
      headers: {
        'Authorization': `Bearer ${buyerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orderResponse.data.success) {
      console.log('⚠️ Order creation failed (expected - no real products/addresses):', orderResponse.data.message);
      console.log('This is expected since we don\'t have real products in the database.\n');
      
      // For testing purposes, let's assume we have an order ID
      const mockOrderId = 'test-order-id';
      const mockAmount = 100.00;
      
      console.log('4. Testing cash payment recording (with mock data)...');
      
      // Step 4: Record cash payment as seller
      const paymentResponse = await axios.post('http://localhost:3000/api/seller/payments/record-cash', {
        orderId: mockOrderId,
        amount: mockAmount,
        notes: 'Cash payment received from customer'
      }, {
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (paymentResponse.data.success) {
        console.log('✅ Cash payment recorded successfully');
        console.log('Payment data:', JSON.stringify(paymentResponse.data.data, null, 2));
      } else {
        console.log('❌ Cash payment recording failed:', paymentResponse.data.message);
      }
    } else {
      const orderId = orderResponse.data.data.id;
      const orderAmount = orderResponse.data.data.totalAmount;
      
      console.log('✅ Order created successfully');
      console.log('Order ID:', orderId);
      console.log('Order Amount:', orderAmount);
      console.log('Order Status:', orderResponse.data.data.status);
      console.log('');

      // Step 4: Record cash payment as seller
      console.log('4. Recording cash payment as seller...');
      const paymentResponse = await axios.post('http://localhost:3000/api/seller/payments/record-cash', {
        orderId: orderId,
        amount: orderAmount,
        notes: 'Cash payment received from customer'
      }, {
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (paymentResponse.data.success) {
        console.log('✅ Cash payment recorded successfully');
        console.log('Payment data:', JSON.stringify(paymentResponse.data.data, null, 2));
        console.log('');

        // Step 5: Check order status from buyer side
        console.log('5. Checking order status from buyer side...');
        const orderStatusResponse = await axios.get(`http://localhost:3000/api/buyer/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${buyerToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (orderStatusResponse.data.success) {
          console.log('✅ Order status retrieved successfully');
          console.log('Updated Order Status:', orderStatusResponse.data.data.status);
          console.log('Payment Status:', orderStatusResponse.data.data.payment?.status);
        } else {
          console.log('❌ Failed to get order status:', orderStatusResponse.data.message);
        }
      } else {
        console.log('❌ Cash payment recording failed:', paymentResponse.data.message);
      }
    }

    // Step 6: Test payment history
    console.log('\n6. Testing payment history...');
    const historyResponse = await axios.get('http://localhost:3000/api/seller/payments/history', {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (historyResponse.data.success) {
      console.log('✅ Payment history retrieved successfully');
      console.log('Total payments:', historyResponse.data.data.pagination.total);
    } else {
      console.log('❌ Failed to get payment history:', historyResponse.data.message);
    }

    // Step 7: Test payment summary
    console.log('\n7. Testing payment summary...');
    const summaryResponse = await axios.get('http://localhost:3000/api/seller/payments/summary', {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (summaryResponse.data.success) {
      console.log('✅ Payment summary retrieved successfully');
      console.log('Summary data:', JSON.stringify(summaryResponse.data.data, null, 2));
    } else {
      console.log('❌ Failed to get payment summary:', summaryResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCashPaymentSystem();
