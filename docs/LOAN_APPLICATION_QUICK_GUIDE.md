# 🏦 Loan Application - Quick Guide

## ✅ **Setup Complete!**

8 Zimbabwe financial partners have been seeded in the database.

---

## 🔄 **2-Step Loan Application Process**

### **Step 1: Get Available Partners**

```http
GET http://localhost:3000/api/seller/loans/partners
Authorization: Bearer {seller-token}
```

**Response includes:**
- Partner ID (use this in Step 2)
- Partner name (CBZ Bank, Steward Bank, etc.)
- Loan amount range (min/max)
- Interest rate
- Repayment term

**Copy the `id` field** from your chosen partner!

---

### **Step 2: Apply for Loan**

```http
POST http://localhost:3000/api/seller/loans/applications
Authorization: Bearer {seller-token}
Content-Type: application/json

{
  "partnerId": "{id-from-step-1}",
  "requestedAmount": 25000,
  "purpose": "Expand inventory - purchase brake pads, filters, spark plugs",
  "businessRevenue": 150000,
  "businessExpenses": 85000,
  "collateralDescription": "Inventory valued at $60,000"
}
```

---

## 💰 **Available Partners**

| Partner | Min | Max | Rate | Term |
|---------|-----|-----|------|------|
| **CBZ Bank** | $5K | $500K | 18.5% | 36 mo |
| **Steward Bank** | $2K | $200K | 19% | 24 mo |
| **FBC Bank** | $10K | $1M | 17.5% | 48 mo |
| **ZB Bank** | $15K | $750K | 16.5% | 36 mo |
| **CABS Microfinance** ⚡ | $500 | $50K | 22% | 12 mo |
| **EcoCash Business** 📱 | $1K | $100K | 24% | 6 mo |
| **Nedbank Zimbabwe** | $20K | $2M | 15.5% | 60 mo |
| **Stanbic Bank** | $25K | $1.5M | 16% | 48 mo |

---

## 📋 **Required Information**

When applying, you need:

1. **partnerId** - From Step 1
2. **requestedAmount** - How much you need ($)
3. **purpose** - Why you need the loan
4. **businessRevenue** - Last 12 months revenue
5. **businessExpenses** - Last 12 months expenses
6. **collateralDescription** (optional) - What you can offer as security

---

## ✅ **Example: Complete Flow**

### **1. Get Partners:**
```bash
curl -X GET http://localhost:3000/api/seller/loans/partners \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Copy partner ID from response:**
```json
{
  "data": [
    {
      "id": "abc123-def456-ghi789",  ← COPY THIS
      "name": "CABS Microfinance",
      "minAmount": 500,
      "maxAmount": 50000
    }
  ]
}
```

### **2. Apply:**
```bash
curl -X POST http://localhost:3000/api/seller/loans/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "abc123-def456-ghi789",
    "requestedAmount": 10000,
    "purpose": "Purchase inventory for busy season",
    "businessRevenue": 75000,
    "businessExpenses": 45000,
    "collateralDescription": "Inventory worth $15,000"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Loan application submitted successfully",
  "data": {
    "id": "loan-app-uuid",
    "status": "SUBMITTED",
    "submittedAt": "2025-10-20T05:15:00.000Z"
  }
}
```

---

## 📊 **Check Your Applications**

### **View All Applications:**
```http
GET http://localhost:3000/api/seller/loans/applications
Authorization: Bearer {seller-token}
```

### **View Specific Application:**
```http
GET http://localhost:3000/api/seller/loans/applications/{application-id}
Authorization: Bearer {seller-token}
```

### **Cancel Application:**
```http
POST http://localhost:3000/api/seller/loans/applications/{application-id}/cancel
Authorization: Bearer {seller-token}
```

---

## 🎯 **Tips for Choosing a Partner**

### **For Small Quick Loans:**
- **CABS Microfinance** ($500-$50K, 12 months)
- **EcoCash Business** ($1K-$100K, 6 months)

### **For Medium Loans:**
- **Steward Bank** ($2K-$200K, 24 months)
- **CBZ Bank** ($5K-$500K, 36 months)

### **For Large Loans:**
- **Nedbank** ($20K-$2M, 60 months) - Lowest rate: 15.5%
- **Stanbic** ($25K-$1.5M, 48 months) - Second lowest: 16%

### **Fastest Approval:**
- **EcoCash** - Mobile-based, instant
- **CABS** - Minimal documentation

---

## ⚠️ **Important Notes**

1. **Partner ID Required:** Always get partners list first (Step 1)
2. **Amount Limits:** Check min/max for each partner
3. **Business Data:** Provide accurate revenue/expense figures
4. **Collateral:** Optional but helps approval
5. **Status Tracking:** Use GET endpoints to check application status

---

## 🚀 **Quick Test**

**1-Minute Test:**
```bash
# Step 1: Get partners
GET /api/seller/loans/partners

# Step 2: Copy first partner ID

# Step 3: Apply
POST /api/seller/loans/applications
{
  "partnerId": "{copied-id}",
  "requestedAmount": 5000,
  "purpose": "Stock expansion",
  "businessRevenue": 50000,
  "businessExpenses": 30000
}
```

---

**📝 Last Updated:** October 20, 2025  
**✅ Status:** 8 Partners Active  
**🏦 Total Loan Capacity:** $500 - $2,000,000



