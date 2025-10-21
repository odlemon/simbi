const axios = require('axios');

const BASE = 'http://localhost:3000/api/buyer';
const PRODUCTS = 'http://localhost:3000/api/buyer/products';
const ANALYTICS = 'http://localhost:3000/api/buyer/analytics';

async function main() {
  const unique = Date.now().toString();
  const email = 'qa_buyer_' + unique + '@example.com';
  const password = 'Password123!';

  const ok = (...args) => console.log('[OK]', ...args);
  const info = (...args) => console.log('[INFO]', ...args);
  const warn = (...args) => console.log('[WARN]', ...args);

  // 1) Register
  info('Registering buyer', email);
  const reg = await axios.post(BASE + '/auth/register', {
    email,
    password,
    firstName: 'QA',
    lastName: 'Buyer',
    buyerType: 'ENTERPRISE',
    phoneNumber: '0770000000'
  });
  ok('Registered', reg.status);

  // 2) Login
  const login = await axios.post(BASE + '/auth/login', { email, password });
  const token = login.data?.data?.accessToken;
  if (!token) throw new Error('No access token returned');
  ok('Logged in, token length', token.length);
  const auth = { headers: { Authorization: 'Bearer ' + token } };

  // 3) Profile
  const profile = await axios.get(BASE + '/auth/profile', auth);
  ok('Profile email', profile.data?.data?.email);

  // 4) Add Address (required for orders)
  const addressRes = await axios.post(BASE + '/addresses', {
    fullName: 'QA Buyer Address',
    phoneNumber: '+263771234567',
    addressLine1: '123 Test Street',
    city: 'Harare',
    province: 'Harare',
    postalCode: '0000',
    isDefault: true
  }, auth);
  const addressId = addressRes.data?.data?.id;
  if (!addressId) throw new Error('No address ID returned');
  ok('Address added', addressId);

  // 5) Product search (advanced)
  await axios.post(PRODUCTS + '/search', {
    q: 'filter',
    make: 'Toyota',
    model: 'Hilux',
    yearFrom: 2012
  }, auth).catch(e => warn('Search response', e.response?.status || e.message));
  ok('Search endpoint reachable');

  // 6) Saved searches (create/list)
  await axios.post(PRODUCTS + '/saved-searches', {
    name: 'QA test ' + unique,
    criteria: { q: 'filter', make: 'Toyota' }
  }, auth);
  const saved = await axios.get(PRODUCTS + '/saved-searches', auth);
  ok('Saved searches count', (saved.data?.data || []).length);

  // 7) Analytics dashboard
  const dash = await axios.get(ANALYTICS + '/dashboard', auth);
  ok('Analytics dashboard totalOrders', dash.data?.data?.overview?.totalOrders ?? 0);

  // 8) Create order with real product ID
  try {
    await axios.post(BASE + '/orders', {
      items: [{ productId: '35930667-1300-4773-8827-02fc9781ca4a', quantity: 1 }],
      addressId: addressId
    }, auth);
    ok('Order created successfully');
  } catch (e) {
    warn('Order creation result', e.response?.data?.error || e.response?.status || e.message);
  }

  // 9) Create quote request with real product ID
  try {
    await axios.post('http://localhost:3000/api/buyer/quotes', {
      productId: '35930667-1300-4773-8827-02fc9781ca4a',
      quantity: 2
    }, auth);
    ok('Quote request created successfully');
  } catch (e) {
    warn('Quote request result', e.response?.data?.error || e.response?.status || e.message);
  }

  // 10) Create dispute (will likely fail due to no real order, but endpoint responds)
  try {
    await axios.post(BASE + '/disputes', {
      orderId: 'dummy-order-id',
      disputeType: 'OTHER',
      description: 'Test dispute for a non-existent order.'
    }, auth);
    ok('Dispute created (expected failure)');
  } catch (e) {
    warn('Dispute creation expected result', e.response?.data?.error || e.response?.status || e.message);
  }

  console.log('\nFlow complete.');
}

main().catch(err => {
  console.error('Flow failed:', err.response?.data || err.message);
  process.exit(1);
});
