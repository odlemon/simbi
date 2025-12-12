// @ts-nocheck
// Script to check uploaded images on Ubuntu server
const axios = require('axios');

const UPLOAD_SERVICE_URL = 'http://31.220.82.129:3050';
const MEDIA_BASE_URL = 'http://31.220.82.129/uploads';

async function checkUploadService() {
  console.log('🔍 Checking Upload Service...\n');

  try {
    // Check health endpoint
    console.log('1. Checking upload service health...');
    const healthResponse = await axios.get(`${UPLOAD_SERVICE_URL}/health`, {
      timeout: 5000
    });
    console.log('   ✅ Service is running:', healthResponse.data);
  } catch (error) {
    console.log('   ❌ Service is not responding:', error.message);
    return;
  }

  console.log('\n2. Upload service is accessible at:', UPLOAD_SERVICE_URL);
  console.log('   Media base URL:', MEDIA_BASE_URL);
  console.log('\n📝 To check files on server, SSH in and run:');
  console.log('   ls -la /var/www/simbi/uploads/returns/');
  console.log('   ls -la /var/www/simbi/uploads/pre-shipment/');
}

checkUploadService();

