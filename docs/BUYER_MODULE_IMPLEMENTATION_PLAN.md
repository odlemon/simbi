# 🛒 Buyer Module - Implementation Plan

**Date:** October 20, 2025  
**Status:** Planning Phase  
**Integration:** Admin + Seller Modules

---

## 📋 **Requirements Summary**

### **Buyer Types**
1. **Individual Buyers** - Mobile-optimized, loyalty program, VIN search
2. **Enterprise Buyers** - B2B features, ERP integration, multi-user management

### **Core Features Required**
- VIN decoding and vehicle compatibility
- Dynamic pricing algorithm (Pdisplay = min(Pseller) + commission)
- Multi-currency support (USD/ZWL)
- Order management and tracking
- Dispute resolution system
- ERP integration (Sage Pastel, SAP)
- Advanced analytics and reporting

---

## 🏗️ **Database Schema Design**

### **Core Buyer Tables**

```sql
-- Individual & Enterprise Buyers
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  buyer_type ENUM('INDIVIDUAL', 'ENTERPRISE') NOT NULL,
  status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') DEFAULT 'ACTIVE',
  
  -- Individual buyer fields
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier ENUM('BRONZE', 'SILVER', 'GOLD') DEFAULT 'BRONZE',
  
  -- Enterprise buyer fields
  company_name VARCHAR(255),
  tax_id VARCHAR(50),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  credit_used DECIMAL(15,2) DEFAULT 0,
  payment_term_days INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise user management
CREATE TABLE enterprise_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES buyers(id),
  user_id UUID REFERENCES buyers(id),
  role ENUM('ACCOUNT_ADMIN', 'PROCUREMENT_OFFICER', 'FINANCE_OFFICER', 'RESTRICTED_BUYER'),
  spending_limit_monthly_usd DECIMAL(15,2),
  monthly_spent_usd DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses for both buyer types
CREATE TABLE buyer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES buyers(id),
  type ENUM('BILLING', 'SHIPPING') NOT NULL,
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Zimbabwe',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES buyers(id),
  seller_id UUID REFERENCES sellers(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DISPUTED'),
  
  -- Pricing
  subtotal_usd DECIMAL(15,2) NOT NULL,
  subtotal_zwl DECIMAL(15,2),
  commission_usd DECIMAL(15,2) NOT NULL,
  commission_zwl DECIMAL(15,2),
  total_usd DECIMAL(15,2) NOT NULL,
  total_zwl DECIMAL(15,2),
  exchange_rate DECIMAL(10,4),
  exchange_rate_locked_at TIMESTAMP,
  
  -- Enterprise fields
  internal_po_number VARCHAR(100),
  cost_center_tag VARCHAR(100),
  approved_by UUID REFERENCES enterprise_users(id),
  
  -- Shipping
  shipping_address_id UUID REFERENCES buyer_addresses(id),
  tracking_number VARCHAR(100),
  estimated_delivery_date DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  master_product_id UUID REFERENCES master_products(id),
  seller_inventory_id UUID REFERENCES seller_inventory(id),
  quantity INTEGER NOT NULL,
  unit_price_usd DECIMAL(10,2) NOT NULL,
  unit_price_zwl DECIMAL(10,2),
  line_total_usd DECIMAL(15,2) NOT NULL,
  line_total_zwl DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  buyer_id UUID REFERENCES buyers(id),
  seller_id UUID REFERENCES sellers(id),
  dispute_type ENUM('WRONG_ITEM', 'DAMAGED_ITEM', 'NOT_DELIVERED', 'DEFECTIVE', 'OTHER'),
  status ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'),
  description TEXT NOT NULL,
  evidence_urls JSON, -- Array of file URLs
  resolution_notes TEXT,
  resolved_by UUID REFERENCES admins(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty transactions
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES buyers(id),
  order_id UUID REFERENCES orders(id),
  points_earned INTEGER NOT NULL,
  points_redeemed INTEGER DEFAULT 0,
  transaction_type ENUM('EARNED', 'REDEEMED', 'EXPIRED'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ERP Integration
CREATE TABLE company_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES buyers(id),
  integration_type ENUM('SAGE_PASTEL', 'SAP', 'CUSTOM'),
  api_endpoint VARCHAR(500),
  api_key_encrypted TEXT, -- AES-256 encrypted
  client_id VARCHAR(255),
  client_secret_encrypted TEXT, -- AES-256 encrypted
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP,
  sync_status ENUM('SUCCESS', 'FAILED', 'PENDING'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE buyer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES buyers(id),
  action VARCHAR(100) NOT NULL,
  target_id UUID, -- Order ID, User ID, etc.
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 **Integration Points**

### **With Admin Module**
```typescript
// SRI monitoring integration
interface SRIAlert {
  sellerId: string;
  sriScore: number;
  threshold: number;
  alertType: 'CRITICAL' | 'WARNING';
}

// Dispute management
interface DisputeResolution {
  disputeId: string;
  adminId: string;
  resolution: 'BUYER_FAVOR' | 'SELLER_FAVOR' | 'NO_FAULT';
  sriImpact: number;
}

// Financial reconciliation
interface FinancialReconciliation {
  orderId: string;
  grossAmount: number;
  commission: number;
  netPayout: number;
  currency: 'USD' | 'ZWL';
}
```

### **With Seller Module**
```typescript
// Dynamic pricing algorithm
interface PricingCalculation {
  masterProductId: string;
  sellerOffers: SellerOffer[];
  commissionRate: number;
  displayPrice: number;
  selectedSeller: string;
}

interface SellerOffer {
  sellerId: string;
  price: number;
  sriScore: number;
  stock: number;
  isEligible: boolean;
}

// Order routing
interface OrderRouting {
  orderId: string;
  buyerId: string;
  items: OrderItem[];
  selectedSeller: string;
  routingReason: string;
}
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Core Buyer Authentication & Profile (Week 1)**
- [ ] Buyer registration (Individual & Enterprise)
- [ ] Authentication system with JWT
- [ ] Profile management
- [ ] Address management
- [ ] Basic dashboard

### **Phase 2: Product Search & Discovery (Week 2)**
- [ ] VIN decoding integration
- [ ] Master product search
- [ ] Dynamic pricing algorithm
- [ ] Product filtering and sorting
- [ ] Shopping cart functionality

### **Phase 3: Order Management (Week 3)**
- [ ] Order creation and processing
- [ ] Payment integration
- [ ] Order tracking
- [ ] Status updates
- [ ] Order history

### **Phase 4: Enterprise Features (Week 4)**
- [ ] Multi-user management
- [ ] Role-based access control
- [ ] Spending limits
- [ ] Approval workflows
- [ ] ERP integration endpoints

### **Phase 5: Advanced Features (Week 5)**
- [ ] Dispute resolution system
- [ ] Loyalty program
- [ ] Analytics and reporting
- [ ] Notifications (SMS/Email)
- [ ] Mobile optimization

---

## 📊 **API Endpoints Structure**

### **Authentication**
```
POST /api/buyer/auth/register
POST /api/buyer/auth/login
POST /api/buyer/auth/refresh
GET  /api/buyer/auth/profile
PATCH /api/buyer/auth/profile
```

### **Product Search**
```
GET  /api/buyer/products/search
GET  /api/buyer/products/vin-decode
GET  /api/buyer/products/batch-search
GET  /api/buyer/products/:id
```

### **Order Management**
```
POST /api/buyer/orders
GET  /api/buyer/orders
GET  /api/buyer/orders/:id
PUT  /api/buyer/orders/:id/cancel
GET  /api/buyer/orders/:id/tracking
```

### **Enterprise Features**
```
GET  /api/buyer/enterprise/users
POST /api/buyer/enterprise/users
PUT  /api/buyer/enterprise/users/:id
GET  /api/buyer/enterprise/integrations
POST /api/buyer/enterprise/integrations
```

### **Analytics & Reporting**
```
GET  /api/buyer/analytics/dashboard
GET  /api/buyer/analytics/spending
GET  /api/buyer/analytics/export
GET  /api/buyer/loyalty/status
```

---

## 🔧 **Technical Requirements**

### **External Integrations**
- **VIN Decoder API** - Vehicle identification
- **SMS Gateway** - Notifications
- **Payment Gateway** - Multi-currency support
- **ERP APIs** - Sage Pastel, SAP integration

### **Performance Requirements**
- **Search latency**: <100ms for 99% of queries
- **Batch search**: <5 seconds for 1000 part numbers
- **API response**: <500ms for common queries
- **Uptime**: 99.99% for integration endpoints

### **Security Requirements**
- **Data encryption**: AES-256 for sensitive data
- **API security**: HTTPS/TLS 1.2+
- **Access control**: RBAC for enterprise users
- **Audit logging**: All actions logged

---

## 📈 **Success Metrics**

### **Individual Buyers**
- VIN search accuracy: >95%
- Checkout completion rate: >80%
- Loyalty program engagement: >60%
- Mobile usage: >70%

### **Enterprise Buyers**
- ERP integration success: >90%
- Order processing time: <2 minutes
- User adoption: >80% of invited users
- Cost savings: >20% vs traditional procurement

---

**🎯 Next Steps:**
1. Review and approve this implementation plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish integration testing framework
