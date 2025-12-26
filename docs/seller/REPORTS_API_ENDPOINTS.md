# Seller Reports API Endpoints

**Base URL:** `/api/seller/reports`  
**Authentication:** All endpoints require `Authorization: Bearer {seller-token}` or staff token with appropriate permissions

**Staff Access:**
- All staff roles can access reports (read-only)
- Sellers: Full access

---

## Report Structure

The reports section has **4 main tabs**, each with its own comprehensive endpoint:

1. **Sales Report** - Sales analysis, trends, and customer insights
2. **Products Report** - Product performance, inventory status, and category analytics
3. **Financial Report** - Financial statements, cash flow, and profitability
4. **Returns Report** - Return requests, refunds, and return analysis

---

## 1. Sales Report

**Endpoint:** `GET /api/seller/reports/sales`

**Description:** Comprehensive sales analysis with trends, breakdowns, top customers, and period-based analytics. Perfect for line/bar charts showing sales trends over time.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |
| `period` | string | No | Grouping period: `daily`, `weekly`, or `monthly` (default: `daily`) | `daily` |

**Example Request:**
```
GET /api/seller/reports/sales?startDate=2024-01-01&endDate=2024-12-31&period=monthly
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Sales report retrieved successfully",
  "data": {
    "summary": {
      "totalOrders": 150,
      "totalRevenue": 50000.00,
      "totalItems": 450,
      "totalCommission": 5000.00,
      "netRevenue": 45000.00,
      "avgOrderValue": 333.33,
      "growth": 15.5
    },
    "trends": {
      "period": "monthly",
      "data": [
        {
          "period": "2024-01-01",
          "orderCount": 12,
          "totalRevenue": 4000.00,
          "totalItems": 36,
          "totalCommission": 400.00,
          "netRevenue": 3600.00
        },
        {
          "period": "2024-02-01",
          "orderCount": 15,
          "totalRevenue": 5000.00,
          "totalItems": 45,
          "totalCommission": 500.00,
          "netRevenue": 4500.00
        }
      ]
    },
    "daily": {
      "data": [
        {
          "date": "2024-01-15",
          "orderCount": 3,
          "totalRevenue": 1000.00,
          "totalItems": 9,
          "totalCommission": 100.00,
          "netRevenue": 900.00,
          "avgOrderValue": 333.33
        },
        {
          "date": "2024-01-16",
          "orderCount": 2,
          "totalRevenue": 800.00,
          "totalItems": 6,
          "totalCommission": 80.00,
          "netRevenue": 720.00,
          "avgOrderValue": 400.00
        }
      ]
    },
    "byCategory": {
      "data": [
        {
          "category": "Brake Components",
          "orderCount": 45,
          "totalRevenue": 15000.00,
          "totalItems": 150,
          "avgOrderValue": 333.33
        },
        {
          "category": "Engine Parts",
          "orderCount": 30,
          "totalRevenue": 12000.00,
          "totalItems": 90,
          "avgOrderValue": 400.00
        }
      ]
    },
    "breakdown": {
      "byStatus": {
        "delivered": 120,
        "processing": 25,
        "shipped": 5
      },
      "byPayment": {
        "paid": 140,
        "partial": 5,
        "unpaid": 5
      }
    },
    "topCustomers": [
      {
        "buyerId": "buyer-uuid-123",
        "buyerName": "John Doe",
        "buyerEmail": "john@example.com",
        "orderCount": 15,
        "totalSpent": 5000.00
      },
      {
        "buyerId": "buyer-uuid-456",
        "buyerName": "Jane Smith",
        "buyerEmail": "jane@example.com",
        "orderCount": 12,
        "totalSpent": 4000.00
      }
    ],
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

**Summary:**
- `totalOrders` (number): Total number of orders
- `totalRevenue` (number): Total revenue from all orders (USD)
- `totalItems` (number): Total items sold
- `totalCommission` (number): Total platform commission (USD)
- `netRevenue` (number): Net revenue after commission (USD)
- `avgOrderValue` (number): Average order value (USD)
- `growth` (number): Growth percentage compared to first period

**Trends (For Charts):**
- `period` (string): Period type (daily/weekly/monthly)
- `data` (array): Array of period data for line/bar charts (grouped by selected period)
  - `period` (string): Period identifier (date or month)
  - `orderCount` (number): Orders in this period
  - `totalRevenue` (number): Revenue in this period
  - `totalItems` (number): Items sold in this period
  - `totalCommission` (number): Commission in this period
  - `netRevenue` (number): Net revenue in this period

**Daily (For Detailed Charts):**
- `data` (array): Daily sales data for detailed line charts (always daily, regardless of period parameter)
  - `date` (string): Date (YYYY-MM-DD)
  - `orderCount` (number): Orders on this date
  - `totalRevenue` (number): Revenue on this date
  - `totalItems` (number): Items sold on this date
  - `totalCommission` (number): Commission on this date
  - `netRevenue` (number): Net revenue on this date
  - `avgOrderValue` (number): Average order value on this date

**By Category (For Category Charts):**
- `data` (array): Sales data grouped by product category
  - `category` (string): Category name
  - `orderCount` (number): Number of orders in this category
  - `totalRevenue` (number): Total revenue from this category
  - `totalItems` (number): Total items sold in this category
  - `avgOrderValue` (number): Average order value for this category

**Breakdown:**
- `byStatus` (object): Orders grouped by status
- `byPayment` (object): Orders grouped by payment status

**Top Customers:**
- `buyerId` (string): Buyer UUID
- `buyerName` (string): Buyer full name
- `buyerEmail` (string): Buyer email
- `orderCount` (number): Number of orders from this customer
- `totalSpent` (number): Total amount spent by this customer

**Frontend Implementation:**
- **Line Charts:**
  - Use `trends.data` to show revenue/orders over time (grouped by selected period)
  - Use `daily.data` for detailed daily trends (revenue, orders, items)
  - Multi-line chart: Combine revenue, orders, and items from `daily.data`
- **Bar Charts:**
  - Use `trends.data` for period comparison (revenue, orders, items)
  - Use `byCategory.data` for category-based sales comparison
  - Use `topCustomers` for top customers by revenue
- **Pie Charts:**
  - Use `breakdown.byStatus` for order status distribution
  - Use `breakdown.byPayment` for payment status distribution
  - Use `byCategory.data` for revenue by category
- **Area Chart:** Use `daily.data` to show revenue area over time
- **Table:** Display `topCustomers` in a sortable table
- **Summary Cards:** Show `summary` metrics as cards with growth indicators

---

## 2. Products Report

**Endpoint:** `GET /api/seller/reports/products`

**Description:** Comprehensive product performance analysis with inventory status, sales metrics, category performance, and graph-ready data for visualizations.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |

**Example Request:**
```
GET /api/seller/reports/products?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Products report retrieved successfully",
  "data": {
    "summary": {
      "totalProducts": 250,
      "activeProducts": 200,
      "inactiveProducts": 50,
      "lowStockCount": 15,
      "outOfStockCount": 5,
      "totalStockValue": 150000.00,
      "activeStockValue": 120000.00
    },
    "products": [
      {
        "inventoryId": "inv-uuid-123",
        "productName": "Brake Pad Set - Front",
        "oemPartNumber": "BP-12345",
        "manufacturer": "ACME Parts",
        "category": "Brake Components",
        "currentPrice": 99.99,
        "currency": "USD",
        "currentStock": 50,
        "stockValue": 4999.50,
        "isLowStock": false,
        "isActive": true,
        "isOutOfStock": false,
        "totalSold": 150,
        "totalRevenue": 14998.50,
        "orderCount": 45,
        "avgOrderValue": 333.30,
        "sellThroughRate": 75.0,
        "salesTrend": [
          {
            "date": "2024-01-15",
            "count": 5
          },
          {
            "date": "2024-01-20",
            "count": 3
          }
        ]
      }
    ],
    "topProducts": [
      {
        "inventoryId": "inv-uuid-123",
        "productName": "Brake Pad Set - Front",
        "totalRevenue": 14998.50,
        "totalSold": 150,
        "orderCount": 45
      }
    ],
    "categoryPerformance": [
      {
        "categoryName": "Brake Components",
        "productCount": 25,
        "totalSold": 500,
        "totalRevenue": 50000.00,
        "stockValue": 30000.00,
        "avgRevenuePerProduct": 2000.00
      },
      {
        "categoryName": "Engine Parts",
        "productCount": 30,
        "totalSold": 400,
        "totalRevenue": 40000.00,
        "stockValue": 25000.00,
        "avgRevenuePerProduct": 1333.33
      }
    ],
    "inventoryStatus": {
      "active": [...],
      "inactive": [...],
      "lowStock": [...],
      "outOfStock": [...]
    },
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

**Summary:**
- `totalProducts` (number): Total products in inventory
- `activeProducts` (number): Active products
- `inactiveProducts` (number): Inactive products
- `lowStockCount` (number): Products with low stock
- `outOfStockCount` (number): Products out of stock
- `totalStockValue` (number): Total inventory value (USD)
- `activeStockValue` (number): Active inventory value (USD)

**Products Array:**
Each product includes:
- `inventoryId` (string): Inventory item UUID
- `productName` (string): Product name
- `oemPartNumber` (string): OEM part number
- `manufacturer` (string): Manufacturer name
- `category` (string): Product category
- `currentPrice` (number): Current selling price
- `currency` (string): Currency code
- `currentStock` (number): Current stock quantity
- `stockValue` (number): Current stock value (price × quantity)
- `isLowStock` (boolean): Whether stock is low
- `isActive` (boolean): Whether product is active
- `isOutOfStock` (boolean): Whether product is out of stock
- `totalSold` (number): Total quantity sold in period
- `totalRevenue` (number): Total revenue from this product
- `orderCount` (number): Number of orders containing this product
- `avgOrderValue` (number): Average order value for this product
- `sellThroughRate` (number): Sell-through rate percentage
- `salesTrend` (array): Daily sales trend data for graphs
  - `date` (string): Date (YYYY-MM-DD)
  - `count` (number): Number of sales on this date

**Top Products:**
- Array of top 20 products by revenue (for bar chart)

**Category Performance:**
- `categoryName` (string): Category name
- `productCount` (number): Number of products in category
- `totalSold` (number): Total items sold in category
- `totalRevenue` (number): Total revenue from category
- `stockValue` (number): Current stock value in category
- `avgRevenuePerProduct` (number): Average revenue per product

**Inventory Status:**
- `active` (array): Active products
- `inactive` (array): Inactive products
- `lowStock` (array): Low stock products
- `outOfStock` (array): Out of stock products

**Frontend Implementation:**
- **Bar Chart:** Use `topProducts` for top products by revenue
- **Pie Chart:** Use `categoryPerformance` for revenue by category
- **Line Chart:** Use `products[].salesTrend` for individual product trends
- **Table:** Display `products` with sortable columns
- **Inventory Status Cards:** Show counts from `summary`
- **Stock Alerts:** Highlight `inventoryStatus.lowStock` and `outOfStock`

---

## 3. Financial Report

**Endpoint:** `GET /api/seller/reports/financial`

**Description:** Comprehensive financial analysis including income statement, cash flow, expense breakdown, and profitability metrics. Perfect for financial dashboards.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |

**Example Request:**
```
GET /api/seller/reports/financial?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Financial report retrieved successfully",
  "data": {
    "incomeStatement": {
      "period": {
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-12-31T23:59:59.999Z"
      },
      "revenue": {
        "grossSales": 50000.00,
        "returnsAndRefunds": 2000.00,
        "netSales": 48000.00
      },
      "costOfGoodsSold": {
        "totalCOGS": 15000.00,
        "grossProfit": 33000.00
      },
      "operatingExpenses": {
        "RENT": 2000.00,
        "UTILITIES": 500.00,
        "WAGES": 8000.00,
        "FUEL": 1000.00,
        "MARKETING": 3000.00,
        "EQUIPMENT": 1500.00,
        "SUPPLIES": 500.00,
        "MAINTENANCE": 800.00,
        "INSURANCE": 600.00,
        "OTHER": 200.00,
        "total": 18100.00
      },
      "operatingIncome": 14900.00,
      "otherIncomeExpenses": {
        "platformFees": 5000.00,
        "otherIncome": 500.00,
        "otherExpenses": 200.00,
        "total": 4700.00
      },
      "netIncome": 10200.00
    },
    "cashFlow": {
      "summary": {
        "totalInflow": 50000.00,
        "totalOutflow": 23100.00,
        "netCashFlow": 26900.00
      },
      "byType": {
        "sales": 50000.00,
        "expenses": 18100.00,
        "commission": 5000.00,
        "refunds": 2000.00,
        "payouts": 0.00
      },
      "trends": [
        {
          "date": "2024-01-15",
          "inflow": 2000.00,
          "outflow": 500.00,
          "net": 1500.00
        },
        {
          "date": "2024-01-16",
          "inflow": 1500.00,
          "outflow": 300.00,
          "net": 1200.00
        }
      ]
    },
    "revenue": {
      "total": 48000.00,
      "trends": [
        {
          "date": "2024-01-15",
          "revenue": 2000.00
        },
        {
          "date": "2024-01-16",
          "revenue": 1500.00
        }
      ]
    },
    "expenses": {
      "total": 18100.00,
      "breakdown": [
        {
          "category": "WAGES",
          "amount": 8000.00,
          "percentage": 44.2
        },
        {
          "category": "MARKETING",
          "amount": 3000.00,
          "percentage": 16.6
        }
      ],
      "byCategory": {
        "RENT": 2000.00,
        "UTILITIES": 500.00,
        "WAGES": 8000.00,
        "FUEL": 1000.00,
        "MARKETING": 3000.00,
        "EQUIPMENT": 1500.00,
        "SUPPLIES": 500.00,
        "MAINTENANCE": 800.00,
        "INSURANCE": 600.00,
        "OTHER": 200.00,
        "total": 18100.00
      },
      "trends": [
        {
          "date": "2024-01-15",
          "expenses": 500.00
        },
        {
          "date": "2024-01-16",
          "expenses": 300.00
        }
      ]
    },
    "profit": {
      "total": 10200.00,
      "trends": [
        {
          "date": "2024-01-15",
          "revenue": 2000.00,
          "expenses": 500.00,
          "profit": 1500.00
        },
        {
          "date": "2024-01-16",
          "revenue": 1500.00,
          "expenses": 300.00,
          "profit": 1200.00
        }
      ]
    },
    "monthly": {
      "data": [
        {
          "month": "2024-01",
          "revenue": 15000.00,
          "expenses": 5000.00,
          "commission": 1500.00,
          "refunds": 500.00,
          "netIncome": 8000.00
        },
        {
          "month": "2024-02",
          "revenue": 18000.00,
          "expenses": 6000.00,
          "commission": 1800.00,
          "refunds": 600.00,
          "netIncome": 9600.00
        }
      ]
    },
    "profitability": {
      "grossProfitMargin": 68.75,
      "operatingMargin": 31.04,
      "netProfitMargin": 21.25
    },
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

**Income Statement:**
- Complete income statement structure (see Financial Statements API docs)
- `revenue`: Gross sales, returns, net sales
- `costOfGoodsSold`: COGS and gross profit
- `operatingExpenses`: Expenses by category with total
- `operatingIncome`: Operating income
- `otherIncomeExpenses`: Platform fees, other income/expenses
- `netIncome`: Final net income

**Cash Flow:**
- `summary`: Total inflow, outflow, net cash flow
- `byType`: Cash flow by transaction type
- `trends` (array): Daily cash flow trends for line chart
  - `date` (string): Date (YYYY-MM-DD)
  - `inflow` (number): Cash inflow on this date
  - `outflow` (number): Cash outflow on this date
  - `net` (number): Net cash flow on this date

**Revenue:**
- `total` (number): Total net revenue
- `trends` (array): Daily revenue trends for line chart
  - `date` (string): Date (YYYY-MM-DD)
  - `revenue` (number): Revenue on this date

**Expenses:**
- `total` (number): Total operating expenses
- `breakdown` (array): Expenses by category with percentages (for pie chart)
- `byCategory` (object): Detailed expense breakdown
- `trends` (array): Daily expense trends for line chart
  - `date` (string): Date (YYYY-MM-DD)
  - `expenses` (number): Total expenses on this date

**Profit:**
- `total` (number): Total net income
- `trends` (array): Daily profit trends for line chart
  - `date` (string): Date (YYYY-MM-DD)
  - `revenue` (number): Revenue on this date
  - `expenses` (number): Expenses on this date
  - `profit` (number): Net profit on this date (revenue - expenses)

**Monthly:**
- `data` (array): Monthly financial summaries for bar/line chart
  - `month` (string): Month identifier (YYYY-MM)
  - `revenue` (number): Total revenue for the month
  - `expenses` (number): Total expenses for the month
  - `commission` (number): Total commission for the month
  - `refunds` (number): Total refunds for the month
  - `netIncome` (number): Net income for the month

**Profitability:**
- `grossProfitMargin` (number): Gross profit margin percentage
- `operatingMargin` (number): Operating margin percentage
- `netProfitMargin` (number): Net profit margin percentage

**Frontend Implementation:**
- **Income Statement Table:** Display `incomeStatement` in structured table
- **Line Charts:**
  - Use `cashFlow.trends` for cash flow over time (inflow, outflow, net)
  - Use `revenue.trends` for revenue trends over time
  - Use `expenses.trends` for expense trends over time
  - Use `profit.trends` for profit trends over time (revenue vs expenses)
  - Use `monthly.data` for monthly financial trends
- **Multi-Line Chart:** Combine `revenue.trends`, `expenses.trends`, and `profit.trends` for comprehensive view
- **Bar Chart:** 
  - Use `monthly.data` for monthly revenue/expenses/profit comparison
  - Use `cashFlow.byType` for cash flow by type
- **Pie Chart:** Use `expenses.breakdown` for expense categories
- **Area Chart:** Use `profit.trends` to show profit area over time
- **Profitability Cards:** Display `profitability` metrics as cards
- **Summary Cards:** Show key financial metrics

---

## 4. Returns Report

**Endpoint:** `GET /api/seller/reports/returns`

**Description:** Comprehensive returns and refunds analysis including return requests, refund amounts, return reasons, and trends.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |

**Example Request:**
```
GET /api/seller/reports/returns?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Returns report retrieved successfully",
  "data": {
    "summary": {
      "totalRefunds": 2000.00,
      "refundCount": 10,
      "avgRefundAmount": 200.00,
      "refundRate": 4.0,
      "totalSales": 50000.00,
      "totalReturnRequests": 15,
      "exchangeRequestCount": 3,
      "returnRequestCount": 12
    },
    "refunds": [
      {
        "id": "ledger-uuid-123",
        "date": "2024-12-15T10:30:00.000Z",
        "amount": 200.00,
        "description": "Refund for order ORD-12345",
        "referenceId": "order-uuid-123"
      }
    ],
    "returnRequests": [
      {
        "id": "dispute-uuid-123",
        "orderId": "order-uuid-123",
        "orderNumber": "ORD-12345",
        "requestType": "RETURN",
        "returnReason": "DEFECTIVE",
        "status": "RESOLVED",
        "buyerName": "John Doe",
        "buyerEmail": "john@example.com",
        "orderAmount": 200.00,
        "createdAt": "2024-12-10T10:00:00.000Z",
        "resolvedAt": "2024-12-15T10:30:00.000Z",
        "faultClassification": "SELLER_FAULT",
        "isFaultBased": true
      }
    ],
    "breakdown": {
      "byReason": [
        {
          "reason": "DEFECTIVE",
          "count": 5
        },
        {
          "reason": "WRONG_PART",
          "count": 4
        },
        {
          "reason": "CHANGE_OF_MIND",
          "count": 3
        }
      ],
      "byStatus": [
        {
          "status": "RESOLVED",
          "count": 8
        },
        {
          "status": "OPEN",
          "count": 5
        },
        {
          "status": "CLOSED",
          "count": 2
        }
      ]
    },
    "trends": [
      {
        "date": "2024-12-10",
        "count": 2,
        "totalAmount": 400.00
      },
      {
        "date": "2024-12-15",
        "count": 1,
        "totalAmount": 200.00
      }
    ],
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

**Summary:**
- `totalRefunds` (number): Total refund amount (USD)
- `refundCount` (number): Number of refund transactions
- `avgRefundAmount` (number): Average refund amount
- `refundRate` (number): Refund rate as percentage of sales
- `totalSales` (number): Total sales for comparison
- `totalReturnRequests` (number): Total return/exchange requests
- `exchangeRequestCount` (number): Number of exchange requests
- `returnRequestCount` (number): Number of return requests

**Refunds:**
- Array of refund transactions from ledger
- `id` (string): Ledger entry ID
- `date` (string): Refund date (ISO format)
- `amount` (number): Refund amount (USD)
- `description` (string): Refund description
- `referenceId` (string): Related order ID

**Return Requests:**
- Array of return/exchange requests (Disputes)
- `id` (string): Dispute/return request ID
- `orderId` (string): Related order ID
- `orderNumber` (string): Order number
- `requestType` (string): "RETURN" or "EXCHANGE"
- `returnReason` (string): Reason for return (DEFECTIVE, WRONG_PART, etc.)
- `status` (string): Request status (OPEN, RESOLVED, CLOSED, etc.)
- `buyerName` (string): Buyer name
- `buyerEmail` (string): Buyer email
- `orderAmount` (number): Original order amount
- `createdAt` (string): Request creation date
- `resolvedAt` (string): Resolution date (if resolved)
- `faultClassification` (string): Fault classification (SELLER_FAULT, BUYER_FAULT, etc.)
- `isFaultBased` (boolean): Whether fault was determined

**Breakdown:**
- `byReason` (array): Returns grouped by reason (for pie chart)
- `byStatus` (array): Returns grouped by status (for pie chart)

**Trends:**
- Array of daily refund trends (for line/bar chart)
- `date` (string): Date (YYYY-MM-DD)
- `count` (number): Number of refunds on this date
- `totalAmount` (number): Total refund amount on this date

**Frontend Implementation:**
- **Line Chart:** Use `trends` for refund trends over time
- **Pie Chart:** Use `breakdown.byReason` or `breakdown.byStatus`
- **Table:** Display `returnRequests` with filters
- **Summary Cards:** Show `summary` metrics
- **Alert Badge:** Highlight high `refundRate`

---

## Common Response Structure

All endpoints follow this standard response structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Report retrieved successfully",
  "data": { /* report-specific data */ },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to get report",
  "error": "Error message",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

---

## Date Format

All date parameters should be in ISO 8601 format:
- **Format:** `YYYY-MM-DD` (e.g., `2024-12-24`)
- **Time:** Optional, defaults to 00:00:00 UTC
- **Full ISO:** `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2024-12-24T14:30:00.000Z`)

**Examples:**
- `startDate=2024-01-01`
- `startDate=2024-01-01T00:00:00.000Z`
- `endDate=2024-12-31`
- `endDate=2024-12-31T23:59:59.999Z`

---

## Frontend Implementation Guide

### Tab Structure

Create 4 tabs in your UI:
1. **Sales Report Tab**
2. **Products Report Tab**
3. **Financial Report Tab**
4. **Returns Report Tab**

### Common UI Components

**1. Date Range Picker**
- Add to all report tabs
- Default: Last 30 days
- Options: Last 7 days, Last 30 days, Last 90 days, Last year, Custom range

**2. Summary Cards**
- Display key metrics from `summary` object
- Use icons and color coding
- Show percentage changes where applicable

**3. Charts**
- **Line Charts:** Use `trends` data for time-series
- **Bar Charts:** Use `topProducts`, `topCustomers`, or category data
- **Pie Charts:** Use breakdown data (byStatus, byCategory, byReason)
- **Area Charts:** Use cash flow trends

**4. Data Tables**
- Sortable columns
- Pagination for large datasets
- Filters and search
- Export to CSV/PDF

**5. Period Selector (Sales Report)**
- Radio buttons or dropdown: Daily, Weekly, Monthly
- Updates the `period` query parameter

### Recommended Chart Libraries

- **Chart.js** - Simple and flexible
- **Recharts** - React-specific, declarative
- **D3.js** - Advanced customizations
- **ApexCharts** - Feature-rich, beautiful charts

### Example React Component Structure

```typescript
// Sales Report Tab
const SalesReport = () => {
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchSalesReport(dateRange.start, dateRange.end, period)
      .then(setData);
  }, [dateRange, period]);

  return (
    <div>
      {/* Date Range Picker */}
      <DateRangePicker onChange={setDateRange} />
      
      {/* Period Selector */}
      <PeriodSelector value={period} onChange={setPeriod} />
      
      {/* Summary Cards */}
      <SummaryCards data={data?.summary} />
      
      {/* Revenue Trend Chart */}
      <LineChart data={data?.trends.data} />
      
      {/* Top Customers Table */}
      <Table data={data?.topCustomers} />
    </div>
  );
};
```

---

## Error Handling

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid date format",
  "error": "Date must be in YYYY-MM-DD format",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "Invalid or missing token",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to get report",
  "error": "Database connection error",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

---

## Performance Notes

- **Large Date Ranges:** For date ranges > 1 year, consider pagination or limiting results
- **Real-time Updates:** Reports are calculated on-demand, not cached
- **Graph Data:** `trends` arrays can be large for daily periods over long ranges
- **Product Lists:** `products` array can be large; consider pagination or limiting

---

## Summary

| Report | Endpoint | Key Metrics | Charts Recommended |
|--------|----------|-------------|---------------------|
| **Sales** | `/sales` | Orders, Revenue, Growth | Line, Bar, Pie |
| **Products** | `/products` | Performance, Inventory | Bar, Pie, Line |
| **Financial** | `/financial` | P&L, Cash Flow, Margins | Line, Pie, Area |
| **Returns** | `/returns` | Refunds, Return Rate | Line, Pie, Bar |

All reports support date filtering and provide graph-ready data for comprehensive visualizations.

