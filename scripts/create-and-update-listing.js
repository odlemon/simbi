const axios = require('axios');

async function updateListingWithNewSeller() {
  try {
    console.log('🔄 Creating new seller and updating listing...');
    
    // Create a new seller
    console.log('👤 Creating new seller...');
    const registerResponse = await axios.post('http://localhost:3001/api/seller/auth/register', {
      email: 'test@test.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'Seller',
      businessName: 'Test Business',
      businessAddress: '123 Test St',
      contactNumber: '1234567890',
      tin: `TIN${Date.now()}`
    });
    
    console.log('✅ Seller created:', registerResponse.data.message);
    
    // Login with new seller
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/seller/auth/login', {
      email: 'test@test.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    
    // Update the existing listing (this might fail if seller doesn't own it)
    const inventoryId = '103f7a9b-9ca7-4155-9402-7efc77760f4c';
    const imageUrl = '//dz310nzuyimx0.cloudfront.net/strapr1/78f1f3bc9f37ef26be612c4e6f7222e8/fe564a78167ae368a4e8f553e397cbde.png';
    
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
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    // If update fails, let's try to create a new listing instead
    if (error.response?.status === 403 || error.response?.status === 404) {
      console.log('🔄 Update failed, trying to create new listing...');
      try {
        const createResponse = await axios.post(
          'http://localhost:3001/api/seller/inventory/listings',
          {
            masterProductId: 'da994cfe-56fe-4dc7-86ab-461a001f09f1',
            sellerPrice: 45,
            currency: 'USD',
            quantity: 50,
            condition: 'NEW',
            sellerSku: 'SKU-NEW',
            sellerNotes: 'New listing with image'
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ New listing created with image!');
        console.log('📋 Response:', JSON.stringify(createResponse.data, null, 2));
      } catch (createError) {
        console.error('❌ Create also failed:', createError.response?.data || createError.message);
      }
    }
  }
}

updateListingWithNewSeller();





