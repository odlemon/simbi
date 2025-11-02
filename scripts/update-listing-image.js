const axios = require('axios');

async function updateSellerListing() {
  try {
    console.log('🔄 Updating seller listing with image...');
    
    const inventoryId = '103f7a9b-9ca7-4155-9402-7efc77760f4c';
    const imageUrl = '//dz310nzuyimx0.cloudfront.net/strapr1/78f1f3bc9f37ef26be612c4e6f7222e8/fe564a78167ae368a4e8f553e397cbde.png';
    
    // First, let's get a seller token by logging in
    console.log('🔐 Logging in as seller...');
    const loginResponse = await axios.post('http://localhost:3001/api/seller/auth/login', {
      email: 'nyashakarata1@gmail.com',
      password: 'Kunda'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    
    // Update the listing with the image
    console.log('📸 Adding image to listing...');
    const updateResponse = await axios.put(
      `http://localhost:3001/api/seller/inventory/listings/${inventoryId}`,
      {
        sellerImages: [imageUrl]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Listing updated successfully!');
    console.log('📋 Response:', JSON.stringify(updateResponse.data, null, 2));
    
    // Verify the update by getting the listing
    console.log('🔍 Verifying update...');
    const verifyResponse = await axios.get(
      `http://localhost:3001/api/seller/inventory/listings/${inventoryId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Verification successful!');
    console.log('📸 Images:', verifyResponse.data.data.sellerImages);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

updateSellerListing();
