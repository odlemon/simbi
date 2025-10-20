// @ts-nocheck
/**
 * Test script to fetch products from the API
 */
import axios from "axios";

const API_URL = "http://localhost:3000/api";

async function testProductsAPI() {
  try {
    console.log("🧪 Testing Products API...\n");

    // Step 1: Login as admin
    console.log("📝 Step 1: Logging in as admin...");
    const loginResponse = await axios.post(`${API_URL}/admin/auth/login`, {
      email: "admin@simbi.com",
      password: "admin123",
    });

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful!\n");

    // Step 2: Get catalog stats
    console.log("📊 Step 2: Fetching catalog statistics...");
    const statsResponse = await axios.get(`${API_URL}/admin/catalog/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("✅ Stats:");
    console.log(`   Total Products: ${statsResponse.data.data.totalProducts.toLocaleString()}`);
    console.log(`   Total Categories: ${statsResponse.data.data.totalCategories}`);
    console.log(`   Active Products: ${statsResponse.data.data.activeProducts.toLocaleString()}`);
    console.log("");

    // Step 3: Get first page of products
    console.log("📦 Step 3: Fetching first 5 products...");
    const productsResponse = await axios.get(
      `${API_URL}/admin/catalog/products?limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`✅ Found ${productsResponse.data.data.products.length} products:\n`);

    productsResponse.data.data.products.forEach((product: any, index: number) => {
      console.log(`   ${index + 1}. ${product.name}`);
      console.log(`      OEM: ${product.oemPartNumber}`);
      console.log(`      Manufacturer: ${product.manufacturer}`);
      console.log(`      Category: ${product.category.name}`);
      console.log(`      Vehicle: ${JSON.stringify(product.vehicleCompatibility)}`);
      console.log("");
    });

    // Step 4: Get categories
    console.log("📂 Step 4: Fetching categories...");
    const categoriesResponse = await axios.get(
      `${API_URL}/admin/catalog/categories`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`✅ Found ${categoriesResponse.data.data.length} categories:\n`);
    console.log("   Top 10:");
    categoriesResponse.data.data
      .slice(0, 10)
      .forEach((cat: any, index: number) => {
        console.log(`   ${index + 1}. ${cat.name} (${cat._count.products} products)`);
      });

    console.log("\n🎉 All tests passed! Products are accessible via API!\n");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Test failed:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.statusText}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.error("");
    process.exit(1);
  }
}

testProductsAPI();



