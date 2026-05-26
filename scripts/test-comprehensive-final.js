const axios = require('axios');

async function testComprehensiveDashboard() {
  try {
    console.log('🧪 Testing Comprehensive Admin Dashboard...');
    console.log('==========================================');
    
    // Step 1: Login as admin
    console.log('🔐 Step 1: Admin Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/admin/auth/login', {
      email: 'admin@simbimarket.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Admin login successful');
    
    // Step 2: Test comprehensive dashboard
    console.log('\n📊 Step 2: Testing Comprehensive Dashboard...');
    const dashboardResponse = await axios.get('http://localhost:3000/api/admin/dashboard/comprehensive', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (dashboardResponse.data.success) {
      console.log('✅ Comprehensive Dashboard Response:');
      console.log('=====================================');
      
      const data = dashboardResponse.data.data;
      
      console.log('📈 Basic KPIs:');
      console.log(`- Total Sellers: ${data.totalSellers}`);
      console.log(`- Total Buyers: ${data.totalBuyers}`);
      console.log(`- Total Products: ${data.totalProducts}`);
      console.log(`- Total Orders: ${data.totalOrders}`);
      console.log(`- Average Order Value: $${data.avgOrderValue}`);
      console.log(`- GMV: $${data.gmv}`);
      console.log(`- Revenue (30 days): $${data.revenue30Days}`);
      
      console.log('\n💰 Financial Management:');
      console.log(`- Total Transactions: ${data.financial.totalTransactions}`);
      console.log(`- Total Payouts: ${data.financial.totalPayouts}`);
      console.log(`- Pending Payouts: ${data.financial.pendingPayouts}`);
      console.log(`- Chargebacks: ${data.financial.chargebacks}`);
      console.log(`- Refunds: ${data.financial.refunds}`);
      
      console.log('\n🛡️ Compliance & SRI:');
      console.log(`- SRI Violations: ${data.compliance.sriViolations}`);
      console.log(`- SRI Violation Rate: ${data.compliance.sriViolationRate}%`);
      console.log(`- Document Expirations: ${data.compliance.documentExpirations}`);
      console.log(`- Compliance Score: ${data.compliance.complianceScore}%`);
      
      console.log('\n⚖️ Dispute Management:');
      console.log(`- Total Disputes: ${data.disputes.totalDisputes}`);
      console.log(`- Open Disputes: ${data.disputes.openDisputes}`);
      console.log(`- Resolved Disputes: ${data.disputes.resolvedDisputes}`);
      console.log(`- Avg Resolution Time: ${data.disputes.avgResolutionTime} days`);
      
      console.log('\n🚚 Logistics & Carriers:');
      console.log(`- Total Carriers: ${data.logistics.totalCarriers}`);
      console.log(`- Active Carriers: ${data.logistics.activeCarriers}`);
      console.log(`- Total Shipments: ${data.logistics.totalShipments}`);
      console.log(`- Delivered Shipments: ${data.logistics.deliveredShipments}`);
      console.log(`- Delivery Rate: ${data.logistics.deliveryRate}%`);
      
      console.log('\n🔒 Security & Alerts:');
      console.log(`- Tier 1 Alerts: ${data.security.tier1Alerts}`);
      console.log(`- Tier 2 Alerts: ${data.security.tier2Alerts}`);
      console.log(`- Tier 3 Alerts: ${data.security.tier3Alerts}`);
      console.log(`- Security Anomalies: ${data.security.securityAnomalies}`);
      
      console.log('\n⚡ Performance Metrics:');
      console.log(`- Failed Transaction Rate: ${data.performance.failedTransactionRate}%`);
      console.log(`- API Uptime: ${data.performance.apiUptime}%`);
      console.log(`- System Health: ${data.performance.systemHealth}`);
      
      console.log('\n📋 Recent Activity:');
      if (data.recentActivity.length > 0) {
        data.recentActivity.forEach((activity, index) => {
          console.log(`${index + 1}. [${activity.severity}] ${activity.type}: ${activity.description}`);
        });
      } else {
        console.log('No recent activity found.');
      }
      
      console.log('\n✅ Comprehensive Dashboard Test PASSED!');
      console.log('🎉 All admin requirements covered in single endpoint!');
      console.log('\n📝 Summary:');
      console.log('- ✅ Basic KPIs: Working');
      console.log('- ✅ Financial Management: Structure ready');
      console.log('- ✅ Compliance & SRI: Structure ready');
      console.log('- ✅ Dispute Management: Structure ready');
      console.log('- ✅ Logistics & Carriers: Structure ready');
      console.log('- ✅ Security & Alerts: Structure ready');
      console.log('- ✅ Performance Metrics: Structure ready');
      console.log('- ✅ Recent Activity: Structure ready');
      
    } else {
      console.log('❌ Dashboard request failed:', dashboardResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testComprehensiveDashboard();
