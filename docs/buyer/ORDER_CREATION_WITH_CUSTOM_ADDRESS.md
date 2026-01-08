# 📦 Order Creation with Custom Shipping Address

## Overview

The order creation endpoint now supports two ways to specify a shipping address:
1. **Use existing address** - Provide `shippingAddressId` of a saved address
2. **Use new address** - Provide `shippingAddress` object with address details (will be created automatically)

This allows buyers to use a different shipping address for a specific order without needing to save it to their profile first.

---

## Endpoint

**POST** `/api/buyer/orders`

**Authentication:** Required (Buyer Bearer Token)

---

## Request Body Options

### Option 1: Use Existing Address

```json
{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "address-uuid-here",
  "poNumber": "PO-2024-001",
  "notes": "Please handle with care",
  "couponCode": "DISCOUNT10"
}
```

### Option 2: Use New Address (One-time)

```json
{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "phoneNumber": "+263771234567",
    "addressLine1": "123 New Street",
    "addressLine2": "Apartment 5B",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263",
    "isDefault": false
  },
  "poNumber": "PO-2024-001",
  "notes": "Deliver to reception desk",
  "couponCode": "DISCOUNT10"
}
```

---

## Field Descriptions

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | Array of order items (min 1 item) |
| `items[].productId` | string | Seller inventory ID or master product ID |
| `items[].quantity` | number | Quantity to order (min 1) |

### Shipping Address (One of the following is required)

**Option A: Use Existing Address**
| Field | Type | Description |
|-------|------|-------------|
| `shippingAddressId` | string | UUID of existing buyer address |

**Option B: Use New Address**
| Field | Type | Description |
|-------|------|-------------|
| `shippingAddress` | object | New address object (see below) |
| `shippingAddress.fullName` | string | Recipient full name (required) |
| `shippingAddress.phoneNumber` | string | Contact phone number (required) |
| `shippingAddress.addressLine1` | string | Primary address line (required) |
| `shippingAddress.addressLine2` | string | Secondary address line (optional) |
| `shippingAddress.city` | string | City name (required) |
| `shippingAddress.province` | string | Province/state name (required) |
| `shippingAddress.postalCode` | string | Postal/ZIP code (optional) |
| `shippingAddress.isDefault` | boolean | Set as default address (optional, default: false) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `poNumber` | string | Purchase order number |
| `costCenter` | string | Cost center code |
| `notes` | string | Order notes/instructions |
| `couponCode` | string | Coupon code for discount |

---

## Response

### Success (201 Created)

```json
{
  "success": true,
  "message": "Order created successfully with 1 order(s) from 1 supplier(s)",
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-2024-001",
        "sellerId": "seller-uuid",
        "sellerName": "ABC Motors",
        "totalAmount": 150.00,
        "itemCount": 2,
        "status": "PENDING_PAYMENT"
      }
    ],
    "totalOrders": 1,
    "totalAmount": 150.00
  }
}
```

### Error Responses

**400 Bad Request - Missing Address**
```json
{
  "success": false,
  "message": "Either shippingAddressId or shippingAddress must be provided",
  "error": "Validation error"
}
```

**400 Bad Request - Invalid Address**
```json
{
  "success": false,
  "message": "Address uuid-here not found",
  "error": "Address validation error"
}
```

**400 Bad Request - Address Doesn't Belong to Buyer**
```json
{
  "success": false,
  "message": "Address uuid-here does not belong to buyer buyer-uuid",
  "error": "Address ownership error"
}
```

---

## Usage Examples

### Example 1: Using Existing Address (cURL)

```bash
curl -X POST http://localhost:3000/api/buyer/orders \
  -H "Authorization: Bearer <buyer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "inventory-123",
        "quantity": 1
      }
    ],
    "shippingAddressId": "address-uuid-here",
    "notes": "Please deliver during business hours"
  }'
```

### Example 2: Using New Address (cURL)

```bash
curl -X POST http://localhost:3000/api/buyer/orders \
  -H "Authorization: Bearer <buyer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "inventory-123",
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "fullName": "Jane Smith",
      "phoneNumber": "+263779876543",
      "addressLine1": "456 Different Street",
      "city": "Bulawayo",
      "province": "Bulawayo",
      "postalCode": "00263",
      "isDefault": false
    },
    "notes": "Deliver to warehouse entrance"
  }'
```

### Example 3: Frontend Implementation (JavaScript)

```javascript
// Scenario: User wants to ship to a different address than their saved one

const createOrder = async (items, shippingAddress) => {
  const orderData = {
    items: items.map(item => ({
      productId: item.inventoryId,
      quantity: item.quantity
    })),
    // If user selected a saved address
    ...(shippingAddress.id ? {
      shippingAddressId: shippingAddress.id
    } : {
      // If user entered a new address
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phoneNumber: shippingAddress.phoneNumber,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        province: shippingAddress.province,
        postalCode: shippingAddress.postalCode,
        isDefault: shippingAddress.saveAsDefault || false
      }
    }),
    notes: shippingAddress.deliveryNotes || ''
  };

  const response = await fetch('/api/buyer/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  return await response.json();
};

// Usage
const order = await createOrder(
  cartItems,
  {
    // Option 1: Use saved address
    id: 'saved-address-uuid'
  }
  // OR
  // Option 2: Use new address
  // {
  //   fullName: 'John Doe',
  //   phoneNumber: '+263771234567',
  //   addressLine1: '123 New Street',
  //   city: 'Harare',
  //   province: 'Harare',
  //   saveAsDefault: false
  // }
);
```

### Example 4: React Component - Order Preview with Address Selection

```javascript
import { useState } from 'react';

const OrderCheckout = ({ cartItems, onOrderPlaced }) => {
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
      onOrderPlaced(result.data);
    }
  };

  return (
    <div>
      <h2>Order Preview</h2>
      
      {/* Order Items Summary */}
      <div>
        <h3>Items</h3>
        {cartItems.map(item => (
          <div key={item.id}>
            {item.productName} x {item.quantity}
          </div>
        ))}
      </div>

      {/* Shipping Address Selection */}
      <div>
        <h3>Shipping Address</h3>
        
        <label>
          <input
            type="radio"
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
            {savedAddresses.map(addr => (
              <option key={addr.id} value={addr.id}>
                {addr.addressLine1}, {addr.city}
              </option>
            ))}
          </select>
        )}

        <label>
          <input
            type="radio"
            checked={useNewAddress}
            onChange={() => setUseNewAddress(true)}
          />
          Use different address
        </label>

        {useNewAddress && (
          <div>
            <input
              placeholder="Full Name"
              value={newAddress.fullName}
              onChange={(e) => setNewAddress({...newAddress, fullName: e.target.value})}
            />
            <input
              placeholder="Phone Number"
              value={newAddress.phoneNumber}
              onChange={(e) => setNewAddress({...newAddress, phoneNumber: e.target.value})}
            />
            <input
              placeholder="Address Line 1"
              value={newAddress.addressLine1}
              onChange={(e) => setNewAddress({...newAddress, addressLine1: e.target.value})}
            />
            <input
              placeholder="City"
              value={newAddress.city}
              onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
            />
            <input
              placeholder="Province"
              value={newAddress.province}
              onChange={(e) => setNewAddress({...newAddress, province: e.target.value})}
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

      <button onClick={handlePlaceOrder}>
        Confirm and Place Order
      </button>
    </div>
  );
};
```

---

## Important Notes

1. **Either/Or Requirement**: You must provide either `shippingAddressId` OR `shippingAddress`, but not both.

2. **New Address Creation**: If you provide `shippingAddress`, it will be automatically created and saved to the buyer's address list. If `isDefault` is set to `true`, it will be marked as the default address.

3. **Address Validation**: The new address will be validated according to the schema requirements (fullName, phoneNumber, addressLine1, city, province are required).

4. **No Separate Endpoint**: This is all handled in the same `/api/buyer/orders` endpoint - no need for a separate address creation endpoint before placing the order.

5. **Order Preview**: The frontend can show a preview of the order with the selected/entered address before the user confirms the purchase.

6. **Backward Compatibility**: Existing implementations using `shippingAddressId` will continue to work without changes.

---

## Frontend Implementation Flow

```
1. User adds items to cart
   ↓
2. User clicks "Checkout" or "Place Order"
   ↓
3. Show Order Preview Screen:
   - Display order items
   - Display order totals
   - Show shipping address options:
     a) Select from saved addresses (radio button)
     b) Enter new address (radio button)
   ↓
4. User selects/enters shipping address
   ↓
5. User clicks "Confirm Order"
   ↓
6. Frontend sends request:
   - If saved address selected → send shippingAddressId
   - If new address entered → send shippingAddress object
   ↓
7. Backend creates order with the address
   ↓
8. Frontend receives success response
```

---

## Benefits

✅ **No separate endpoint needed** - Everything handled in one request  
✅ **Flexible shipping** - Use different address per order without saving first  
✅ **Optional saving** - User can choose to save new address or use it once  
✅ **Backward compatible** - Existing code using `shippingAddressId` still works  
✅ **Preview support** - Frontend can show order preview before confirmation  

---

## Related Endpoints

- **`GET /api/buyer/addresses`** - Get all saved addresses (use this to populate the address dropdown in the preview modal)
- **`GET /api/buyer/addresses/default`** - Get the default address
- `POST /api/buyer/addresses` - Create a new address (if you want to save it before ordering)
- `GET /api/buyer/orders` - View order history

**📖 See [BUYER_ADDRESSES_API.md](./BUYER_ADDRESSES_API.md) for complete address management API documentation.**

