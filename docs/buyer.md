Software Requirements Document:
Commercial Buyer Module
Project: Simbi Marketplace
Document Version: 2.0
Date: September 20, 2025
Author: TR
1. Introduction
This document outlines the comprehensive functional and non-functional requirements for
the Commercial Buyer Module of the Simbi marketplace. This module is an extension of the
primary consumer-facing platform, tailored specifically for the unique needs of businesses
and corporate entities engaged in bulk auto parts procurement (e.g., transport companies,
authorized service centers, large garages). Its core purpose is to facilitate the bulk
procurement of auto parts and, most importantly, to provide seamless, automated
integration with the client's existing enterprise resource planning (ERP) or accounting
software, such as Sage and Pastel. This approach moves beyond a standard e-commerce
experience to create a unified, efficient, and auditable purchasing pipeline for B2B
transactions. The primary objective is to eliminate manual data entry, reduce procurement
cycles from days to minutes, and provide real-time financial visibility directly within the
buyer's preferred system.
1.1 Project Goals and Critical Success Factors
● Streamlined Procurement via Automation: Enable businesses, from small garages to
large fleet management companies, to find and purchase auto parts quickly and in bulk
through an intuitive interface. The system must support repeat orders, quick-add
functionalities, and multi-user accounts. Critical Success Factor (CSF): 80% of repeat
orders are initiated via the quick-add or saved list functionality.
● ERP/Procurement System Integration (The Core Differentiator): This is the module's
most critical feature. The system must provide a secure and reliable method for
commercial buyers to link their Simbi account with their existing enterprise systems. This
integration will enable the automatic synchronization of product data, the submission
of authenticated purchase orders (POs), and the transfer of invoice and
reconciliation data, creating a fully automated, auditable workflow from procurement to
reconciliation. CSF: Integration setup time must be less than 30 minutes for a standard
Sage or Pastel environment.
● Centralized Account Management & Governance: Allow a single company account to
be managed by multiple users, each with a defined role and granular permissions. This
includes the ability to set per-order or monthly spending limits, ensuring strict
compliance with internal procurement policies and providing the Account Admin with
robust financial control. CSF: Zero unauthorized purchases due to overridden spending
limits.
● Transparent Reporting & Auditability (Financial Compliance): Offer detailed
transaction histories, invoice management, and robust reporting capabilities, including
customizable filtering by cost center or project code. This data will facilitate internal
auditing, financial reconciliation, and strategic analysis of spending trends, crucial for tax
compliance and budget management in the Zimbabwean context. CSF: 100% data
integrity between Simbi invoice data and the synced data in the buyer's ERP.
1.2 Target Audience
This document is primarily for the development and design teams responsible for building the
Commercial Buyer Module. It will also serve as a critical reference for quality assurance (QA)
testers, project stakeholders, and the technical and procurement teams of the commercial
buyers who will be the end-users. The interface should be designed for the Procurement
Officer (speed and accuracy), the Finance Officer (auditability and integration), and the
Company Administrator (control and compliance).
2. User Stories (Expanded Workflow Detail)
The following user stories describe the key functionalities from the perspective of a
commercial buyer, providing a detailed narrative for each workflow.
● Dashboard & Analytics (Fixed Layout)
○ As a procurement manager, I want to see a fixed dashboard providing a high-level
summary of our company's recent orders, spending trends, and most frequently
purchased items to effectively manage our budget and stock holding. The view
should default to the last 90 days of activity.
○ As a finance officer, I want to view a detailed breakdown of our spending by
product category (e.g., Engine, Suspension, Braking), seller, and time period
using customizable date pickers so I can perform in-depth cost analysis and identify
potential cost-saving opportunities or supplier risk concentration.
○ As a company administrator, I want to view all active users within our company
account and their individual purchasing activity, including their last login date and
total spending against their assigned limit, to ensure compliance with our internal
policies and track user engagement.
○ As a logistics coordinator, I want a dedicated widget showing the shipping status
of all open orders with estimated delivery dates to optimize our receiving bay
operations.
● Product Search & Discovery
○ As a procurement officer, I want to perform an advanced search for auto parts
using multiple criteria, including make, model, year, engine type, and a specific OEM
part number, to quickly find the correct item without any ambiguity. The search
results must prioritize products that are currently in stock and meet our minimum
required quantity.
○ As a procurement officer, I want to upload a .csv or paste a list of multiple
part_numbers into a single field and have the system find all available matches at
once, displaying stock levels and prices, to streamline bulk purchasing. The system
must highlight any part numbers that yielded zero results for immediate follow-up.
○ As a procurement officer, I want to be able to save my frequent searches and
product lists (e.g., "Monthly Service Kit - Toyota Hilux Fleet") so I can quickly access
and re-order common parts with a single click, populating the cart instantly.
● Procurement System Integration (Technical Focus)
○ As a procurement manager, I want to securely connect my company's Sage or
Pastel system to Simbi so that our internal product catalog on Simbi is automatically
synced daily and purchase orders can be created directly from our own familiar
software interface.
○ As a finance officer, I want to receive a digital order confirmation, shipping
updates, and the final invoice data directly into our internal accounting system as
soon as an order is placed and delivered on Simbi, eliminating the need for manual
data entry and facilitating automated reconciliation.
○ As an IT administrator, I want clear documentation and a secure API endpoint on
Simbi that allows our internal system to poll for order status changes every 15
minutes if webhooks are not supported by our legacy system.
● Order Management
○ As a procurement officer, I want to track the status of all our company's orders in
real-time, from "PO Received" to "Seller Processing," "Awaiting Dispatch," "Shipped
(with tracking number)," and "Delivered." The order status page should show a
complete history of all status changes with timestamps and the responsible seller's
name (visible only on the order details page for troubleshooting).
○ As a finance officer, I want to easily download all invoices for a specific time period,
with customizable filters (e.g., by date, project code, or user), in a standard format
(e.g., CSV, PDF) for our accounting records and audits. Filtering by project/cost
code is mandatory for internal chargeback procedures.
● Company Account Management (Governance)
○ As a company administrator, I want to add new users to our company's Simbi
account via email invitation and assign them different roles with specific access
rights, which must include setting default shipping/billing addresses per user.
○ As a company administrator, I want to set a hard, non-negotiable per-order or
monthly spending limit for each user within my company account to control costs
and prevent unauthorized purchases. The system must display a clear error message
and prevent checkout if the limit is exceeded.
3. User Interface (UI) & Design Requirements
The commercial buyer interface must be exceptionally clean, professional, and data-focused.
It should function as a high-efficiency tool, minimizing clicks and prioritizing speed and robust
reporting.
3.1 Color Palette and Aesthetic
The color palette will be consistent with a professional, serious tone suitable for B2B tools.
● Primary: A professional, dark grey (#2C3E50) for the main background and navigation to
convey stability and seriousness.
● Secondary: A lighter grey (#ECF0F1) for card backgrounds and content areas, ensuring
high contrast for data.
● Accent: A cool blue (#3498DB) for interactive elements and data visualization
(charts/graphs). This should be used exclusively for actionable buttons and active states.
● Text: Dark grey (#34495E) for readability on light backgrounds.
● Status Colors: A clear system of color-coded indicators: Success: Green (#2ECC71),
Warning (Low Stock/Over Budget): Yellow (#F1C40F), Error/Critical: Red (#E74C3C).
3.2 Layout & Components
● Dashboard (Fixed Layout): The dashboard will feature a fixed, two-column layout
with a clear hierarchy. It must include:
○ Key Performance Indicators (KPI) Tiles: Four large tiles displaying: Total Spend
(YTD), Open Purchase Orders (Count), Pending Invoice Total, and Available Monthly
Budget.
○ Data Tables: All tables must implement client-side data processing for instant
sorting, filtering, and searching. Every row must include a hyperlink to the detailed
record (Order ID or Invoice ID).
● Typography: The portal will use a professional, sans-serif font like Roboto for all data
display to ensure legibility and a clean, modern aesthetic. Financial data should use a
fixed-width numerical display for easy columnar comparison.
3.3 Dashboard Specifics (Chart Types and Data Definitions)
The fixed dashboard provides four critical data visualizations:
Widget Title Type Data Definition Developer Notes /
Look and Feel
Monthly Spending
Trend
Line Chart Total Gross Spend
(USD/ZWL) over the
last 12 months,
segmented by
currency.
Use two distinct
lines for USD and
ZWL. Must include
hover-over tooltips
showing exact
totals for each
month.
Spending by
Category
Pie Chart Breakdown of total
spend (last 6
months) across the
top 5 product
categories (e.g.,
Engine, Electrical,
Bodywork).
Slices must be
clearly labeled and
represent a
minimum of 5% of
total spend; all
others grouped into
"Other."
Supplier
Performance
Horizontal Bar
Chart
Top 5 Sellers by
Total Revenue
generated from this
company over the
last quarter.
Provides a visual
metric of supplier
reliance. Bars
should be shaded
in the Accent Blue
(#3498DB).
Budget Utilization Donut
Chart/Gauge
Percentage of the
monthly
company-wide
spending limit
utilized to date.
Red/Yellow/Green
coloring based on
utilization (Red >
80%). Shows
remaining budget
clearly in the center
of the donut.
3.4 Flowchart Descriptions
High-Level Commercial Buyer Workflow Flowchart
1. Start: Secure Login: The user logs into the Simbi Commercial Buyer Module via a
dedicated, secure login page (MFA optional, but encouraged).
2. Dashboard/Authorization Check: The user lands on the fixed dashboard. System
checks user's role and spending limit. Any attempt to bypass the limit must be logged
immediately.
3. Action Path: From the dashboard, the user navigates:
○ Procurement Officer: Navigates to Product Search (Quick Add) to find parts,
Saved Lists for repeat orders, and Order History to view/track.
○ Finance Officer: Navigates to Order History to download invoices and Reports for
reconciliation data.
○ Account Admin: Navigates to Company Settings to manage users, roles, limits, or
system integration.
4. Integration Path (Background): The system continuously runs scheduled jobs or listens
for webhooks to synchronize data with the linked ERP/Pastel system (see Procurement
Integration Flowchart below).
5. End: Secure Logout: The user logs out, and the session is terminated.
Procurement Integration Flowchart
This flowchart outlines the critical, back-end process for connecting Simbi with a company's
internal procurement system (Sage/Pastel).
1. Start: Initiate Secure Connection: The user, with Account Admin privileges, initiates the
integration process from the Company Settings page.
2. Credential Input & Storage: Admin inputs API credentials (API Key, Client ID, Secret,
Integration URL) from their external system. Developer Note: Credentials must be
encrypted at rest using an AES-256 algorithm and stored in a secure key vault, never
directly in the database.
3. API Bridge Authentication Handshake: The Simbi API Bridge service attempts to
establish a secure, authenticated connection to the external procurement system's API. A
successful connection token is stored temporarily for subsequent calls.
4. Data Sync - Product Information (Initial Load & Delta Updates):
○ Initial Load: Simbi pushes a comprehensive list of bulk-available products
(part_name, part_number, price, stock_quantity, zimspares_part_id) to the external
system's product sync endpoint.
○ Delta Updates: A scheduled job runs nightly to push only changes (price or stock
updates) to minimize bandwidth use and integration latency.
5. Order Placement & Sync (Purchase Order Listener):
○ Listener Configuration: The Simbi API bridge registers as a listener for Purchase
Order (PO) creation events originating from the buyer’s Sage/Pastel system (using
webhooks or polling).
○ PO Validation: Upon receiving an external PO, the bridge validates its contents
against the current Simbi stock/price data. If out-of-stock, the PO is rejected back to
the external system with a failure message.
○ Order Submission: If validated, the bridge places a corresponding order on Simbi
via a secure POST /api/v1/orders endpoint. The request MUST include the
internal_po_number for traceability.
6. Status Sync (Real-Time Polling): The Simbi order status is automatically updated. The
API bridge, through a polling mechanism (every 15 minutes) or receiving webhooks from
the Simbi system, pushes these status updates back to the external procurement
system's status update endpoint. MANDATORY: The API bridge must map Simbi status
codes (e.g., 2: PROCESSING) to the external system's status codes (e.g.,
IN_VENDOR_HOLD).
7. Invoice & Reconciliation (Final Step): Once an order is marked as Delivered on Simbi,
the system generates a final digital invoice. The API bridge then exports this invoice data
(line items, total cost, invoice number, VAT/Tax Breakdown) and sends it to the buyer's
internal system's invoice reconciliation endpoint. This final step completes the automated
audit trail.
8. End: The process is complete, and the order is fully reconciled across both systems.
4. Functional Requirements (Granularity)
4.1 Dashboard & Analytics
● FR-C-4.1.1 (Data Segmentation): The dashboard must allow the user to filter all
financial data based on custom tags applied to orders (e.g., Project Code, Cost Center).
These tags must be selectable dropdowns defined by the Account Admin.
● FR-C-4.1.2 (Search Optimization): The universal search bar must employ fuzzy
matching and search across Order ID, Internal PO Number, and Product Name
simultaneously, providing predictive results instantly.
4.2 Product Search & Discovery
● FR-C-4.2.1 (Batch Search Requirement): The batch search result must clearly display
the status for each entered part number: Found (In Stock), Found (Out of Stock), Not
Found (No Match in Catalog). The output must be downloadable.
● FR-C-4.2.2 (Quote Request): If a product is out of stock, the system must allow the
user to easily initiate a Quote Request for the item, which is routed to the corresponding
seller.
4.3 Procurement System Integration (Core Feature)
● FR-C-4.3.1 (Configuration Templates): The system must provide pre-configured
connection templates for Sage Pastel Evolution and Sage Intacct, pre-filling standard
API scopes and data formats used in Zimbabwe.
● FR-C-4.3.2 (Error Handling): If a sync job fails (e.g., the external API is down), the Simbi
bridge must implement exponential backoff and retry the connection up to three times
before logging a critical error in the Admin Module and notifying the Company Admin.
4.4 Order Management & Reporting
● FR-C-4.4.1 (Mandatory Data Export): The CSV/XLSX export function must include
mandatory fields required for accounting: Order ID, Internal PO Number, Date, Total Cost
(USD/ZWL), VAT/Tax Amount, Shipping Cost, and Cost Center Tag.
● FR-C-4.4.2 (Dispute Initiation): The order details page must include a clearly visible
button to "Initiate Dispute" that automatically populates the Order ID and provides a
structured form for issue logging (e.g., Wrong Item Received, Item Damaged).
4.5 Company Account Management
● FR-C-4.5.1 (Role Granularity): The system must support the following predefined roles,
with permissions strictly enforced:
○ Account Admin: Full access. Can set/update spending limits (FR-C-4.5.2).
○ Procurement Officer: Can search, create orders, and track. Cannot view financial
reports or manage users/limits.
○ Finance Officer: Can view/download invoices and financial reports. Cannot place
orders or manage users/limits.
○ Restricted Buyer: Can search and add items to the cart, but requires Admin
Approval for checkout, regardless of spending limit.
● FR-C-4.5.2 (Spending Limit Enforcement): The spending limit must be enforced at the
Checkout API level. The API must verify the user's role and monthly_spent against the
spending_limit before committing the transaction.
5. Non-Functional Requirements (Expanded Detail)
● Performance: All pages must load within 2 seconds. The batch search functionality must
be highly optimized (using inverted indices or in-memory caching) to handle lists of up to
1,000 part numbers and return results in less than 5 seconds. API response times for
common queries (e.g., retrieving a company's order history) must not exceed 500ms.
● Security: The module must have robust authentication and authorization. All API
communication must be encrypted via HTTPS/TLS 1.2 or higher. Company data should be
strictly isolated and inaccessible to other buyers. Security Audit Requirement: All
credentials (API keys, secrets) must be obfuscated in logs and UI.
● Usability: The interface must be intuitive for a professional user. The quick-add/batch
search function should be accessible via a prominent button on the main navigation bar.
● Reliability: The Simbi integration API endpoint must have a minimum uptime of 99.99%
to ensure uninterrupted data flow to client systems. The service must be designed for
high availability with redundancy across different zones.
● Scalability: The system must be designed to handle up to 5,000 active commercial
buyers, processing an average of 500 synchronized orders per hour during peak times
without degradation in performance.
6. Technical Considerations (Detailed Specifications)
● API Endpoints (Examples): The API must adhere to RESTful principles and use
predictable versioning (/api/v1/).
○ Simbi API (Bulk & Status):
■ GET /api/v1/products/batch?part_numbers=...: Accepts a comma-separated list.
Required Response Field: seller_id (for traceability, only visible to the buyer on
the order details page).
■ POST /api/v1/orders/create_from_po: Dedicated endpoint for external systems,
requiring internal_po_number as a unique identifier. Returns zimspares_order_id.
○ Simbi Webhook Listener: A dedicated, authenticated endpoint (POST
/api/v1/webhooks/status_update) for external systems to query for status changes,
mitigating the need for excessive polling.
● Data Payload (Example for Invoice Sync - Mandatory Fields):
{
"zimspares_invoice_id": "INV-ZS-90876",
"order_id": "ZS-ORD-554433",
"internal_po_number": "PO-123456",
"invoice_date": "2025-09-20",
"total_amount_usd": 1500.00,
"total_tax_usd": 180.00,
"cost_center_tag": "Fleet_Maintenance_Q3",
"line_items": [
{
"zimspares_part_id": "PZ-4567-B",
"unit_price": 100.00,
"quantity": 10,
"line_total": 1000.00
}
]
}
● Database Schema (Conceptual - Extended):
○ companies table: id, name, billing_details, sage_api_key (Encrypted), pastel_config
(JSONB), integration_status (ACTIVE/INACTIVE), last_sync_timestamp.
○ company_users table: user_id, company_id, role, spending_limit_monthly_usd,
monthly_spent_usd, last_login_at.
○ orders table: id, company_id, user_id, status, total_cost_usd, internal_po_number,
cost_center_tag, last_status_sync_at.
○ audit_logs table: id, company_user_id, action, target_id (Order/User ID), details
(JSONB for contextual data), timestamp. Required Logged Actions:
ORDER_PLACED_ABOVE_LIMIT, LIMIT_UPDATED, INTEGRATION_ATTEMPT_FAILED.