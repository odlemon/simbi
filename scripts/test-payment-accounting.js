const axios = require('axios');

async function testPaymentAccounting() {
  try {
    console.log('🔍 Testing Payment Accounting System...\n');

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

    // Step 2: Test cash payment recording with accounting
    console.log('2. Testing cash payment recording with accounting entries...');
    const paymentResponse = await axios.post('http://localhost:3000/api/seller/payments/record-cash', {
      orderId: 'test-order-123',
      amount: 100.00,
      notes: 'Cash payment received from customer - testing accounting entries'
    }, {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (paymentResponse.data.success) {
      console.log('✅ Cash payment recorded successfully');
      console.log('Payment data:', JSON.stringify(paymentResponse.data.data.payment, null, 2));
      
      if (paymentResponse.data.data.accounting) {
        console.log('\n📊 Accounting Entries Created:');
        console.log('Entries created:', paymentResponse.data.data.accounting.entriesCreated);
        console.log('Commission:', paymentResponse.data.data.accounting.commission);
        console.log('Net Revenue:', paymentResponse.data.data.accounting.netRevenue);
        console.log('Summary:', JSON.stringify(paymentResponse.data.data.accounting.summary, null, 2));
      } else {
        console.log('❌ No accounting entries created');
      }
    } else {
      console.log('❌ Cash payment recording failed:', paymentResponse.data.message);
    }

    // Step 3: Test payment accounting summary
    console.log('\n3. Testing payment accounting summary...');
    const accountingSummaryResponse = await axios.get('http://localhost:3000/api/seller/payments/accounting-summary?days=30', {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (accountingSummaryResponse.data.success) {
      console.log('✅ Payment accounting summary retrieved successfully');
      console.log('Accounting Summary:', JSON.stringify(accountingSummaryResponse.data.data, null, 2));
    } else {
      console.log('❌ Failed to get accounting summary:', accountingSummaryResponse.data.message);
    }

    // Step 4: Test payment history
    console.log('\n4. Testing payment history...');
    const historyResponse = await axios.get('http://localhost:3000/api/seller/payments/history', {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (historyResponse.data.success) {
      console.log('✅ Payment history retrieved successfully');
      console.log('Total payments:', historyResponse.data.data.pagination.total);
      console.log('Recent payments:', historyResponse.data.data.payments.length);
    } else {
      console.log('❌ Failed to get payment history:', historyResponse.data.message);
    }

    // Step 5: Test regular payment summary
    console.log('\n5. Testing regular payment summary...');
    const summaryResponse = await axios.get('http://localhost:3000/api/seller/payments/summary', {
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (summaryResponse.data.success) {
      console.log('✅ Payment summary retrieved successfully');
      console.log('Summary:', JSON.stringify(summaryResponse.data.data, null, 2));
    } else {
      console.log('❌ Failed to get payment summary:', summaryResponse.data.message);
    }

    console.log('\n🎉 Payment accounting system test completed!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPaymentAccounting();
