Software Requirements Document:
Seller Portal (Integrated ERP)
Project: simbiMarketplace (Seller ERP Module)
Document Version: 2.0
Date: September 20, 2025
Author: Project Manager
1. Introduction
This document outlines the detailed functional and non-functional requirements for the Seller
Portal of the simbimarketplace. The goal is to transform the seller's interface from a simple
listing tool into a powerful, integrated Enterprise Resource Planning (ERP) system that
manages sales, inventory, accounting, and staff, directly supporting business growth in
Zimbabwe.
1.1 Project Goals and Strategic Rationale
● Operational Efficiency: Provide sellers with centralized tools (Inventory, HR, Accounting)
to reduce administrative overhead and improve stock turnover.
● Financial Empowerment: Integrate automated accounting and a secure loan application
workflow to facilitate stock replenishment and access to capital via platform partners.
● Data Integrity Enforcement: Ensure all product listings are tied to the Master
Auto-Parts Dataset to guarantee searchability and minimize incorrect listings.
● Regulatory Compliance: Provide simplified reporting tools for local regulatory bodies
(e.g., ZIMRA).
1.2 Target Audience
This document is for the development and design teams responsible for building the Seller
ERP Module APIs, front-end interface, and database integrations.
2. Core User Stories (Expanded)
2.1 Dashboard & Performance Monitoring
ID User Story Strategic Benefit
US-S-201 As a seller, I want to see my
Gross Sales, Net Profit
Margin, and Current
Stock Value (in USD/ZWL)
instantly upon login so I
Quick, high-level business
assessment.
can gauge my financial
health.
US-S-202 I want a clear visual alert
showing products with
Less than 3 days of
estimated stock cover so
I can prioritize
replenishment.
Proactive inventory
management to prevent
lost sales.
US-S-203 I want to view my Top 10
Selling Products by
revenue and volume over
the last 30 days using a bar
chart so I can identify
market demand trends.
Optimize purchasing and
pricing strategies.
US-S-204 I want to access my Store
Health Score (dispatch
speed, rating, dispute rate)
so I can maintain platform
compliance and optimize
my competitive positioning.
Governance adherence and
dispute reduction.
2.2 Inventory Management & Listing
ID User Story Strategic Benefit
US-S-205 As a seller, when adding
stock, I want to search the
Master Dataset and have
the Part Number, Make,
Model, and Category
auto-fill so I ensure listing
accuracy.
Eliminates data entry errors
and ensures part
standardization.
US-S-206 I want to bulk upload a
CSV to update prices and
stock levels for up to 500
items at once and receive a
validation report for any
High-efficiency stock
management and rapid
pricing changes.
failed rows.
US-S-207 I want to track my
Inventory Value by
Category using a pie chart
so I can identify capital
allocation risks (e.g.,
overstocking slow-moving
categories).
Capital management and
inventory risk assessment.
US-S-208 I want to view a history of
all price changes and stock
level adjustments for any
given product, including
the date and the staff
member responsible.
Internal audit trail and staff
accountability.
3. New Module User Stories (ERP Focus)
3.1 Accounting Module
ID User Story Strategic Benefit
US-S-301 As a seller, I want the
system to automatically
log all platform sales,
commissions, and
transaction fees into a
ledger so I have a clean
record of marketplace
income/expense.
Reduces manual data entry
and ensures accuracy.
US-S-302 I want to manually input my
Operating Expenses
(Rent, Utilities,
Non-platform Wages, etc.)
so I have a complete Profit
& Loss (P&L) statement.
Comprehensive P&L
calculation for accurate
business review.
US-S-303 I want to download a PDF
summary report that
Facilitates regulatory
compliance and tax
aggregates all required
ZIMRA/Tax data (e.g., VAT
inputs/outputs) in a
standard format for
submission.
preparation.
US-S-304 I want to export my general
ledger data in a format
compatible with Sage
Pastel (e.g., specific CSV
or XML structure) for
external reconciliation.
Seamless integration with
common local accounting
software.
3.2 HR/Staff Management Module
ID User Story Strategic Benefit
US-S-305 As a seller, I want to create
staff accounts with
defined access roles (e.g.,
Stock Manager, Order
Dispatcher) to delegate
tasks securely.
Enhances security and
internal control by limiting
access.
US-S-306 My staff should be able to
use a simple interface to
clock in and clock out
daily, and I should see a
summary of their total
hours worked weekly.
Accurate tracking of labor
costs and staff efficiency.
US-S-307 I want to track the order
processing time attributed
to each Dispatcher to
identify training needs or
high-performing staff
members.
Staff performance analysis
and process optimization.
3.3 Financial Loan Application Module
ID User Story Strategic Benefit
US-S-308 I want to see a list of
Partner Financial
Institutions and their
current loan offerings
(interest rates, terms).
Provides accessible
financing options directly
within the marketplace.
US-S-309 I want to securely submit a
loan application, specifying
the loan amount and the
inventory type I plan to
replenish (e.g., $5,000 for
filters/oil pumps).
Ties financing directly to
business needs (stock
replenishment).
US-S-310 I want the system to
automatically share my
verified sales history and
inventory value with the
selected partner bank via
API, without manually
downloading and sending
documents.
Expedites the loan approval
process by providing
trusted, real-time data.
4. User Interface (UI) & Design Requirements
The Seller Portal must be intuitive, modern, and high-performance, designed to handle data
density without feeling cluttered.
4.1 Color Palette
The design must project stability and professionalism, contrasting sharply with the Admin's
dark theme.
● Primary Background: Light Grey/Off-White (#ECF0F1) for a clean, expansive look.
● Primary Accent: Corporate Blue (#3498DB) for headings, main buttons, and active
states, signifying trust.
● Secondary Accent: Muted Green (#2ECC71) for success messages, positive stock levels,
and profit indicators.
● Alerts: Orange (#F39C12) for low stock, and Red (#E74C3C) for critical issues or account
warnings.
4.2 Layout & Navigation
● Header Bar: Fixed top bar for Search, Notifications, and Quick-Access KPIs (e.g.,
"Pending Orders").
● Vertical Sidebar: Simplified left-hand navigation: Dashboard, Inventory, Orders,
Accounting, Staff, Financing.
● Sleek & Modern: Use minimal shadows, rounded corners (rounded-lg in Tailwind terms),
and ample white space to ensure high information density remains readable.
4.3 Dashboard Specifics (Chart Types and Fixed Layout)
The dashboard will utilize a fixed, two-column layout focusing on Actionable Inventory and
Financial Summary.
Widget Type Data Visualization Focus
Sales
Performance
Line Chart 12-Month Rolling
Revenue/Volume.
Two lines tracking
revenue (USD) and
unit volume sold,
revealing
seasonality.
Stock Value
Allocation
Pie Chart Current Inventory
Value by Category.
Segmented by
primary categories
(e.g., Engine,
Suspension, Body),
showing capital
tied up in each.
Stock Cover
Status
Gauge Chart Percentage of
inventory below the
low stock
threshold.
Visual indicator of
operational risk,
using the
Red/Orange/Green
status.
Top/Bottom 10
Performers
Bar Chart Top 10 by Revenue,
Bottom 10 by Units
Sold.
Horizontal bar
charts to easily
compare item
performance
against peers.
5. Functional Requirements (Detailed Breakdown)
5.1 Inventory Management (FR-S-5.1.x)
● FR-S-5.1.1 (Master Dataset Integration): The listing creation process MUST start with a
call to the /api/master/parts/search endpoint. The seller must select an entry, which
populates all regulatory/technical fields.
● FR-S-5.1.2 (Seller Defined Fields): The seller is only permitted to manually enter: Price
(ZWL/USD), Stock Quantity, Condition (New/Used), Seller SKU, and up to 5
High-Resolution Images.
● FR-S-5.1.3 (Low Stock Alerts): The system must allow the seller to set a reorder point
(e.g., 10 units). Once stock falls below this point, an alert is triggered in the notification
center (US-S-202).
5.2 Accounting & Financial Reporting (FR-S-5.2.x)
● FR-S-5.2.1 (Automated Ledger): All marketplace transactions (Sales, Commissions,
Refunds) must be automatically logged into a dual-entry ledger system within the seller's
account. This data is read-only for the seller.
● FR-S-5.2.2 (Expense Entry): Sellers must be able to categorize and manually log
external expenses (Wages, Rent, Fuel). Required Fields: Date, Amount, Category
(Dropdown), Description, Receipt Upload (Optional).
● FR-S-5.2.3 (ZIMRA Report Generation): A dedicated section must generate a
downloadable PDF report summarizing sales and expense data for a selected tax period
(monthly/quarterly), specifically including:
○ Total Revenue (VATable and Non-VATable).
○ Total Commission Paid (Platform Expense).
○ Summary of VAT Input (on platform purchases) and VAT Output (on sales).
● FR-S-5.2.4 (Export Compatibility): The system must provide a data export function
(/api/seller/financials/export?format=pastel) that generates a CSV file with field mappings
(Date, Description, Debit, Credit) compatible with Sage Pastel Partner, requiring minimum
reformatting by the user.
5.3 HR/Staff Management (FR-S-5.3.x)
● FR-S-5.3.1 (Role-Based Access Control - RBAC): Sellers must be able to assign
granular permissions (roles) to staff accounts. Required Roles: Stock Manager (Inventory
Read/Write), Dispatcher (Order Status Update Only), Finance View (Accounting Read
Only).
● FR-S-5.3.2 (Time Tracking): Staff login must include a mandatory "Clock In" action,
logging the staff user ID and timestamp. A corresponding "Clock Out" action must be
logged at the end of the shift (US-S-306).
● FR-S-5.3.3 (Payroll Report): The HR section must generate a weekly report for the
seller showing Staff Name, Total Hours Worked, and Calculated Gross Wage (based on a
user-defined hourly rate).
5.4 Loan Application Integration (FR-S-5.4.x)
● FR-S-5.4.1 (Partner API Gateway): The system must host a secure, dedicated API
Gateway (/api/finance/apply) that acts as an intermediary between the seller and the
partner financial institution.
● FR-S-5.4.2 (Secure Data Transmission): Upon seller submission (US-S-309), the
system must compile a standardized JSON payload including:
○ Seller ID, Requested Amount, Purpose.
○ Verified Data (Automated): Last 6 months of Net Revenue, Total Current Inventory
Value, Store Health Score.
○ The payload MUST NOT include bank account credentials or private login
information.
● FR-S-5.4.3 (Application Status Tracking): Once submitted, the seller's application
status must be updated based on responses from the partner API: SUBMITTED,
UNDER_REVIEW, APPROVED, REJECTED. The system must display the status in the UI in
real-time.
6. Flowchart: New Product Listing (Master Dataset
Constraint)
This flow illustrates how the seller's input is constrained by the centralized, immutable Master
Dataset, minimizing listing errors.
1. Start: Seller clicks "Add New Product" in the Inventory Module.
2. Seller Searches Master Dataset (CRITICAL): The seller enters a Make, Model, or Part
Number into a mandatory search box.
3. System Query: The system queries the /api/master/parts/search endpoint for matches.
4. No Match Found: System displays a message: "Part not found. Please verify number or
contact support to add to Master Dataset." (FLOW ENDS).
5. Match Found: System displays a list of matching parts.
6. Seller Selects Part: Seller selects the exact part they are listing.
7. Auto-Populate Listing Form: The form fields for Part Number, Make, Model, and
Category are locked/read-only and populated with Master Dataset values.
8. Seller Inputs Variables: Seller manually enters only the remaining, variable fields: Price,
Stock Quantity, Condition, Seller SKU, and uploads Images.
9. System Validation (Seller Data): System validates Price format and Stock Quantity (>
0).
10. Listing Submitted: Seller submits the complete listing.
11. System Sets Status: System sets listing status to LIVE.
12. Flow End.
7. Technical and Non-Functional Requirements
7.1 Security & Compliance
● Data Isolation: Seller financial data (Accounting Module) must be logically isolated and
secured, accessible only via authenticated seller APIs.
● Loan API Security: The FR-S-5.4.1 API Gateway must use OAuth 2.0 Client Credentials
and strong encryption (TLS 1.2+) for all communication with financial partners.
● RBAC Enforcement: All staff actions (Inventory update, Order dispatch) must be strictly
validated against the staff member's assigned role (FR-S-5.3.1) on the server side.
7.2 Performance & Integration
● Bulk Processing: The bulk upload/update (US-S-206) must be implemented as an
asynchronous background job to prevent UI timeouts. The seller should be notified
when the job is complete.
● Data Consistency: Any change to a listing's status or stock level MUST trigger an
immediate cache invalidation on the main buyer search index to prevent stock
discrepancies.
7.3 Database Schema Considerations (Conceptual)
● seller_inventory table: master_part_id (FK), seller_id (FK), price_usd, price_zwl, stock_qty,
reorder_point, seller_sku.
● seller_ledger table: seller_id, transaction_date, type (SALE/EXPENSE/COMMISSION),
category, amount_usd, reference_id (Order ID/Expense ID).
● seller_staff table: seller_id, staff_user_id, role, hourly_rate.
● staff_time_log table: staff_user_id, clock_in_time, clock_out_time.