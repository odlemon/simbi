# 📍 Buyer Addresses API

## Overview

Endpoints for managing buyer shipping addresses. Use these endpoints to fetch addresses for the order preview modal and manage saved addresses.

---

## Endpoints

### 1. Get All Addresses

**GET** `/api/buyer/addresses`

**Authentication:** Required (Buyer Bearer Token)

**Description:** Get all saved addresses for the authenticated buyer. Addresses are sorted with default address first.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "address-uuid-1",
      "buyerId": "buyer-uuid",
      "fullName": "John Doe",
      "phoneNumber": "+263771234567",
      "addressLine1": "123 Main Street",
      "addressLine2": "Apartment 4B",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "address-uuid-2",
      "buyerId": "buyer-uuid",
      "fullName": "John Doe",
      "phoneNumber": "+263771234568",
      "addressLine1": "456 Oak Avenue",
      "addressLine2": null,
      "city": "Bulawayo",
      "province": "Bulawayo",
      "postalCode": "00263",
      "isDefault": false,
      "createdAt": "2024-01-20T14:20:00.000Z",
      "updatedAt": "2024-01-20T14:20:00.000Z"
    }
  ]
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique address identifier (UUID) |
| `buyerId` | string | Buyer who owns this address |
| `fullName` | string | Recipient full name |
| `phoneNumber` | string | Contact phone number |
| `addressLine1` | string | Primary address line |
| `addressLine2` | string \| null | Secondary address line (optional) |
| `city` | string | City name |
| `province` | string | Province/state name |
| `postalCode` | string \| null | Postal/ZIP code (optional) |
| `isDefault` | boolean | Whether this is the default address |
| `createdAt` | string | ISO timestamp of creation |
| `updatedAt` | string | ISO timestamp of last update |

**Sorting:** Addresses are sorted by:
1. Default address first (`isDefault: true`)
2. Most recently created first

---

### 2. Get Default Address

**GET** `/api/buyer/addresses/default`

**Authentication:** Required (Buyer Bearer Token)

**Description:** Get the buyer's default shipping address.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "address-uuid-1",
    "buyerId": "buyer-uuid",
    "fullName": "John Doe",
    "phoneNumber": "+263771234567",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263",
    "isDefault": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (No Default Address):**

```json
{
  "success": false,
  "message": "No default address found",
  "error": "NO_DEFAULT_ADDRESS"
}
```

---

### 3. Get Address by ID

**GET** `/api/buyer/addresses/:id`

**Authentication:** Required (Buyer Bearer Token)

**Description:** Get a specific address by its ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "address-uuid-1",
    "buyerId": "buyer-uuid",
    "fullName": "John Doe",
    "phoneNumber": "+263771234567",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263",
    "isDefault": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (Address Not Found):**

```json
{
  "success": false,
  "message": "Address not found",
  "error": "ADDRESS_NOT_FOUND"
}
```

---

### 4. Create Address

**POST** `/api/buyer/addresses`

**Authentication:** Required (Buyer Bearer Token)

**Request Body:**

```json
{
  "fullName": "John Doe",
  "phoneNumber": "+263771234567",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apartment 4B",
  "city": "Harare",
  "province": "Harare",
  "postalCode": "00263",
  "isDefault": false
}
```

**Required Fields:**
- `fullName`
- `phoneNumber`
- `addressLine1`
- `city`
- `province`

**Optional Fields:**
- `addressLine2`
- `postalCode`
- `isDefault` (default: `false`)

**Response:**

```json
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "id": "address-uuid-new",
    "buyerId": "buyer-uuid",
    "fullName": "John Doe",
    "phoneNumber": "+263771234567",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263",
    "isDefault": false,
    "createdAt": "2024-01-25T12:00:00.000Z",
    "updatedAt": "2024-01-25T12:00:00.000Z"
  }
}
```

---

### 5. Update Address

**PUT** `/api/buyer/addresses/:id`

**Authentication:** Required (Buyer Bearer Token)

**Request Body:** (All fields optional, only include fields to update)

```json
{
  "fullName": "Jane Smith",
  "phoneNumber": "+263779876543",
  "addressLine1": "789 New Street",
  "city": "Bulawayo",
  "province": "Bulawayo"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Address updated successfully",
  "data": {
    "id": "address-uuid-1",
    "buyerId": "buyer-uuid",
    "fullName": "Jane Smith",
    "phoneNumber": "+263779876543",
    "addressLine1": "789 New Street",
    "addressLine2": "Apartment 4B",
    "city": "Bulawayo",
    "province": "Bulawayo",
    "postalCode": "00263",
    "isDefault": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-25T12:00:00.000Z"
  }
}
```

---

### 6. Delete Address

**DELETE** `/api/buyer/addresses/:id`

**Authentication:** Required (Buyer Bearer Token)

**Response:**

```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

**Error Response (Address Not Found):**

```json
{
  "success": false,
  "message": "Address not found",
  "error": "ADDRESS_NOT_FOUND"
}
```

---

### 7. Set Default Address

**POST** `/api/buyer/addresses/:id/set-default`

**Authentication:** Required (Buyer Bearer Token)

**Description:** Set a specific address as the default. This will automatically unset any previously default address.

**Response:**

```json
{
  "success": true,
  "message": "Default address updated successfully",
  "data": {
    "id": "address-uuid-2",
    "buyerId": "buyer-uuid",
    "fullName": "John Doe",
    "phoneNumber": "+263771234568",
    "addressLine1": "456 Oak Avenue",
    "addressLine2": null,
    "city": "Bulawayo",
    "province": "Bulawayo",
    "postalCode": "00263",
    "isDefault": true,
    "createdAt": "2024-01-20T14:20:00.000Z",
    "updatedAt": "2024-01-25T12:00:00.000Z"
  }
}
```

---

## Usage Examples

### Example 1: Fetch Addresses for Order Preview (JavaScript)

```javascript
// Fetch all addresses to display in order preview modal
const fetchAddresses = async () => {
  const response = await fetch('/api/buyer/addresses', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();
  
  if (result.success) {
    // Addresses are already sorted with default first
    const defaultAddress = result.data.find(addr => addr.isDefault);
    const otherAddresses = result.data.filter(addr => !addr.isDefault);
    
    return {
      default: defaultAddress,
      all: result.data,
      others: otherAddresses
    };
  }
  
  return null;
};

// Usage in order preview modal
const addresses = await fetchAddresses();
```

### Example 2: React Component - Address Selection in Order Preview

```javascript
import { useState, useEffect } from 'react';

const OrderPreviewModal = ({ cartItems, onPlaceOrder }) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    isDefault: false
  });

  useEffect(() => {
    // Fetch addresses when modal opens
    const loadAddresses = async () => {
      const response = await fetch('/api/buyer/addresses', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setAddresses(result.data);
        // Auto-select default address
        const defaultAddr = result.data.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      }
    };

    loadAddresses();
  }, []);

  const handlePlaceOrder = async () => {
    const orderData = {
      items: cartItems.map(item => ({
        productId: item.inventoryId,
        quantity: item.quantity
      })),
      ...(useNewAddress ? {
        shippingAddress: newAddress
      } : {
        shippingAddressId: selectedAddressId
      })
    };

    const response = await fetch('/api/buyer/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    if (result.success) {
      onPlaceOrder(result.data);
    }
  };

  return (
    <div className="order-preview-modal">
      <h2>Order Preview</h2>
      
      {/* Order Items */}
      <div className="order-items">
        <h3>Items</h3>
        {cartItems.map(item => (
          <div key={item.id}>
            {item.productName} x {item.quantity} - ${item.price * item.quantity}
          </div>
        ))}
      </div>

      {/* Shipping Address Selection */}
      <div className="shipping-address">
        <h3>Shipping Address</h3>
        
        {/* Option 1: Use Saved Address */}
        <label>
          <input
            type="radio"
            name="addressOption"
            checked={!useNewAddress}
            onChange={() => setUseNewAddress(false)}
          />
          Use saved address
        </label>
        
        {!useNewAddress && (
          <select
            value={selectedAddressId || ''}
            onChange={(e) => setSelectedAddressId(e.target.value)}
          >
            <option value="">Select address...</option>
            {addresses.map(addr => (
              <option key={addr.id} value={addr.id}>
                {addr.fullName} - {addr.addressLine1}, {addr.city}
                {addr.isDefault && ' (Default)'}
              </option>
            ))}
          </select>
        )}

        {/* Option 2: Use New Address */}
        <label>
          <input
            type="radio"
            name="addressOption"
            checked={useNewAddress}
            onChange={() => setUseNewAddress(true)}
          />
          Use different address
        </label>

        {useNewAddress && (
          <div className="new-address-form">
            <input
              placeholder="Full Name *"
              value={newAddress.fullName}
              onChange={(e) => setNewAddress({...newAddress, fullName: e.target.value})}
              required
            />
            <input
              placeholder="Phone Number *"
              value={newAddress.phoneNumber}
              onChange={(e) => setNewAddress({...newAddress, phoneNumber: e.target.value})}
              required
            />
            <input
              placeholder="Address Line 1 *"
              value={newAddress.addressLine1}
              onChange={(e) => setNewAddress({...newAddress, addressLine1: e.target.value})}
              required
            />
            <input
              placeholder="Address Line 2"
              value={newAddress.addressLine2}
              onChange={(e) => setNewAddress({...newAddress, addressLine2: e.target.value})}
            />
            <input
              placeholder="City *"
              value={newAddress.city}
              onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
              required
            />
            <input
              placeholder="Province *"
              value={newAddress.province}
              onChange={(e) => setNewAddress({...newAddress, province: e.target.value})}
              required
            />
            <input
              placeholder="Postal Code"
              value={newAddress.postalCode}
              onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})}
            />
            <label>
              <input
                type="checkbox"
                checked={newAddress.isDefault}
                onChange={(e) => setNewAddress({...newAddress, isDefault: e.target.checked})}
              />
              Save as default address
            </label>
          </div>
        )}
      </div>

      {/* Order Total */}
      <div className="order-total">
        <h3>Total: ${cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</h3>
      </div>

      <button onClick={handlePlaceOrder}>
        Confirm and Place Order
      </button>
    </div>
  );
};
```

### Example 3: Display Address in Preview (cURL)

```bash
# Get all addresses
curl -X GET http://localhost:3000/api/buyer/addresses \
  -H "Authorization: Bearer <buyer-token>"

# Get default address only
curl -X GET http://localhost:3000/api/buyer/addresses/default \
  -H "Authorization: Bearer <buyer-token>"
```

---

## Integration with Order Creation

When placing an order, you can use the address data in two ways:

1. **Use Saved Address**: Send `shippingAddressId` from the fetched addresses
2. **Use New Address**: Send `shippingAddress` object (will be created automatically)

See [ORDER_CREATION_WITH_CUSTOM_ADDRESS.md](./ORDER_CREATION_WITH_CUSTOM_ADDRESS.md) for details.

---

## Error Responses

All endpoints may return these common errors:

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

---

## Notes

1. **Default Address**: Only one address can be set as default at a time. Setting a new default automatically unsets the previous default.

2. **Address Sorting**: The `GET /api/buyer/addresses` endpoint returns addresses sorted with:
   - Default address first
   - Most recently created first

3. **Address Formatting**: For display purposes, you can format addresses like:
   ```
   {fullName}
   {addressLine1}
   {addressLine2 ? addressLine2 + '\n' : ''}
   {city}, {province} {postalCode}
   Phone: {phoneNumber}
   ```

4. **Validation**: All address fields follow the same validation rules as order creation. See the order creation documentation for field requirements.



