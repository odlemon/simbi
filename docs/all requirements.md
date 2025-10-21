Overall Software Requirements
Document (SRD) & Project Brief
Project Title: Simbi market: Zimbabwe AutoParts
Marketplace
Version:2.0
Date: October 1, 2025
1. Project Brief
Simbi market is a planned, high-integrity e-commerce platform strategically positioned
to formalize and digitize the auto parts procurement process in Zimbabwe. The
platform’s core mission is to mitigate the market’s current challenges—specifically
informality, price opacity, high risk of counterfeit parts, and unreliable stock
data—by operating as a single, highly vetted marketplace. The prevalence of
counterfeit and gray market imports currently undermines consumer trust and imposes
significant economic costs on vehicle owners and businesses. Simbi market directly
addresses this by introducing mandatory VIN validation and a highly governed Seller
Reliability Index (SRI), effectively acting as a quality filter. The goal is to move the
market toward a trusted, standardized, and transparent procurement environment.
Beyond mere commerce, the platform aims to establish the benchmark for quality
assurance, thereby reducing vehicle downtime and maintenance costs for all buyers,
from individual consumers to large commercial fleets.
The architecture comprises two Buyer Tenant modalities: the Individual Buyer Tenant
(optimized for mobile search and transaction) and the Enterprise Buyer Tenant
(tailored for high-volume procurement and automated ERP/accounting integration).
This dual-segment approach ensures all buyer types experience a secure and reliable
service, while a network of fully compliant sellers operates on the backend.
The platform's operational foundation rests on three pillars:
1. Multi-Currency Resilience: Native support for both USD and ZWL to navigate
the dual-currency Zimbabwean economy, with transparent, locked exchange
rates at the point of sale.
2. The Dynamic Pricing and Commission Algorithm: Ensures competitive pricing
by calculating the buyer's cost (Pdisplay ) based on the lowest price offered by
the most reliable seller (determined by the Seller Reliability Index, SRI).
3. The 2-Million-Part Master Database: An authoritative, read-only dataset that
enforces mandatory product standardization, drastically reducing listing errors
and increasing buyer trust through guaranteed part accuracy via mandatory VIN
validation.
The architecture comprises the two distinct Buyer Tenant systems, the Seller Tenant (a
comprehensive ERP-lite system for compliance and operations), and the Super Admin
Tenant (the central control hub for governance, finance, and regulatory compliance).
Simbi market aims to deliver a world-class, Apple-inspired user experience that
promotes trust, efficiency, and stability in a crucial national sector. The platform's
success hinges on absolute simplicity and reliability, ensuring that even users with
limited digital literacy can complete complex procurement tasks without friction.
2. Core Business Logic & Unique Selling Proposition
(USP)
2.1 The Dynamic Pricing and Commission Algorithm (USP)
The system must ensure high price competitiveness while simultaneously prioritizing
high-reliability sellers to minimize operational risk for the platform.
Feature Description Rationale / Detail
Input
Data
For a specific Master
Product ID, collect
all available seller
offers (Price,
Inventory, Seller
Reliability Index -
SRI).
The data retrieval must be optimized using inmemory caching (Redis) to serve price quotes
within milliseconds, maintaining UI
responsiveness. The system must also check
Seller Eligibility Status (must be above SRI
threshold of 70).
Pricing
Formula
Pdisplay
=min(Pseller )+(Psell
er ×Crate )
Buyers see the lowest wholesale price offered
by any seller, marked up by a transparent
platform commission. This strategy ensures
Simbi market is always the price leader. Crate
must be flexible and configurable by Admin per
product category (e.g., 10% for high-volume
consumables, 5% for large specialty items) and
must be auditable.
MultiCurrency
Support
The system must
handle pricing in
both USD and ZWL.
Sellers set their
Pseller in a primary
currency (USD
preferred). The
system must
calculate the ZWL
equivalent using a
daily, auditable,
exchange rate feed
(e.g., RBZ official
rate) for display
purposes.
Crucial for adapting to local economic volatility.
The exchange rate used for sales must be locked
at the point of transaction initiation. If the
exchange rate feed fails, the system must revert
to the previous day's rate and raise a Tier 1
(Critical) Admin Alert. The rate lock must
include the specific exchange rate applied (e.g., 1
USD = 5000 ZWL) to prevent arbitrage between
order submission and payment processing.
Selection
Logic
1. Find the seller with
the lowest Pseller . 2.
If Pseller is tied, the
seller with the
highest SRI wins. 3. If
the highest SRI seller
has insufficient
inventory, the
algorithm moves to
the next best
price/SRI
combination.
This is the core logic. If a seller’s SRI falls below
a defined threshold (e.g., 70), they are
automatically excluded from the selection pool
until the score is rectified. The system must run a
failover check: if no seller is found (due to
inventory/SRI exclusion), the Buyer is
immediately notified that the part is unavailable
and given an option to be notified when stock
returns, preventing checkout failure.
Commis
sion
Handling
The commission
(Pdisplay −Pseller ) is
automatically
deducted before
payment remittance.
The platform must generate audit reports
showing the gross sale, commission deducted,
and net payout amount, ensuring regulatory
transparency. The report structure must include:
Transaction ID, Invoice Value (Pdisplay ), Gross
Seller Payout, Platform Commission
(USD/ZWL), Payment Gateway Fee, and Seller
TIN/Tax ID. Payouts to sellers must be
scheduled weekly, contingent upon the
successful completion (delivery confirmation) of
the corresponding order.
Fraud
Preventi
on
Implement AntiSniping Rate Limits:
Any seller attempting
more than three
Pseller updates per
product per hour
must trigger an alert
to Admin and a
temporary API block
on price editing.
Prevents algorithmic exploitation and ensures a
fair, stable marketplace for buyers. Upon
triggering, the seller must receive an in-app
notification indicating their pricing API has been
locked for a 24-hour cooling period, and Admin is
reviewing the activity. Repeated violations (3
strikes in 90 days) will result in a permanent
revocation of inline price editing privileges.
2.2 Master Product Data Set (2 Million Parts)
This read-only dataset is the source of truth for all product descriptions and
specifications.
Requirement Specification Compliance & Quality Check
Data Source Initial dataset upload (preexisting 2M parts).
Ongoing maintenance and
addition strictly by Admin
only. The dataset must
contain mandatory fields:
MasterPartID, OEM Part
Number, Vehicle
Compatibility JSON (VIN
range/engine code),
Dimensional Data (for
logistics), and Weight.
Initial data ingestion requires data
cleansing scripts to remove
duplicates, standardize measurement
units (Metric preferred), and normalize
manufacturer names. The system must
enforce a Schema Validation policy for
all new data imports to prevent
corruption.
VIN
Decoding
Service
Integration with a reliable
third-party VIN decoding
API.
The system must, upon VIN submission
by the Buyer, return a verified list of
vehicle attributes (Make, Model, Year,
Engine Type) to filter the 2M dataset.
This verification process is
mandatory before showing parts. If
the VIN decoder API fails, the system
must revert to a cached Vehicle
Selector interface (Make/Model/Year
dropdowns) as a fallback, and raise a
Tier 2 Admin Alert. The fallback
interface must mandate selection of
Make, Model, Year, Engine Code, and
Trim Level to ensure high confidence
matching.
Product
Upload Flow
Sellers must link to a
MasterPartID. Custom
Product Addition requires
Admin approval.
The Custom Product Request form
must mandate the submission of at
least three high-resolution images and
a PDF of the OEM specification sheet
before Admin review. The Admin review
process must enforce a Service Level
Objective (SLO) of 72 hours for
approval or rejection. The Custom
Product must be subjected to a
mandatory "Counterfeit Check"
workflow before approval, requiring the
admin to verify supplier
documentation.
Indexing
Strategy
Utilize a full-text search
index optimized for fuzzy
matching of complex part
numbers (alphanumeric
strings containing
dashes/slashes).
The search function must implement an
algorithm that penalizes results with
low relevance while ensuring highquality matches rise to the top, even
with minor input errors. Search must
include synonym mapping (e.g.,
mapping common local slang or
misspellings to official part names). The
search latency KPI must be maintained
below 100ms for 99% of queries.
2.3 Formalizing the Seller Reliability Index (SRI)
The SRI is a dynamic, weighted score calculated hourly and is the primary determinant
in order routing and seller ranking.
SRI Calculation Formula (General):
SRI=(WFulfilment ×RFulfilment )+(WDelivery ×RDelivery )+(WDefect
×RDefect )+(WCompliance ×RCompliance )
Where W is the assigned weight, and R is the calculated rate (expressed as a decimal,
from 0.0 to 1.0).
Factor Weight (W) Metric Calculation
Detail (R)
Consequence of Low Score
(Enforcement)
Fulfilmen
t Rate
40% RFulfilment =Orders
Accepted+Orders
Rejected or Timed
OutOrders Accepted
over the last 90
days. Failure to
accept or explicitly
reject an order
within 12 hours is
counted as a
rejection.
Automatic exclusion from the
Pricing Algorithm pool if below
70%. If the rate drops below 50%,
the seller's account receives a
temporary 7-day visibility
shadow ban, where their parts
are only visible to Enterprise
Buyers actively filtering for lowSRI suppliers.
On-Time
Delivery
Rate
40% RDelivery =Total
Delivered
OrdersDelivered On
Time (within ETA) .
Calculated based on
the difference
between the
Carrier's final
delivery timestamp
and the system's
quoted ETA.
Increased delivery time padding
shown to buyers (e.g., 1−3 days
becomes 3−5 days), making the
seller less competitive and
indirectly lowering their visibility.
Sellers must be able to initiate a
SRI Penalty Appeal for logistics
delays caused by unforeseen,
documented third-party factors
(e.g., extreme weather event),
triggering Admin review.
Return/D
efect
Rate
15% (Customer Initiated
Returns / Total
Delivered Orders).
This rate includes
returns for "Wrong
Part Supplied" or
"Defective/Counterf
eit Product."
Admin investigation triggered if
above 5% (indicating possible
counterfeit or low-quality goods).
A confirmed counterfeit report
triggers an an immediate and
permanent SRI penalty of 30
points, regardless of the current
score, and a full forensic audit of
the seller's inventory.
Docume
nt
Complia
nce
5% Binary check:
ZIMRA, TIN, and KYC
documents are
current and valid.
RCompliance is 1.0
if all documents are
Immediate suspension if noncompliant documents (e.g.,
expired ZIMRA certificate) are
detected. The seller is locked out
of all system functions, including
inventory updates and payroll.
valid, and 0.0
otherwise.
2.4 Legend of Symbols and Key Technical Acronyms
To ensure clarity in the pricing algorithms and technical specifications, the following
symbols and acronyms are used throughout this document:
Symbol /
Acronym
Definition Context
Pdisplay Display Price (Buyer Cost) The final price the Buyer sees and pays,
calculated with commission.
Pseller Seller Price (Wholesale
Cost)
The raw price offered by the seller, used
as the base for the commission
calculation.
Crate Commission Rate The percentage charged by the Simbi
market platform on the seller's price.
min(...) Minimum Value Function Used to select the lowest price offered by
all eligible sellers for a part.
SRI Seller Reliability Index A weighted score (calculated hourly) used
to prioritize the most trustworthy sellers.
USD United States Dollar One of the two primary currencies
supported for transactions.
ZWL Zimbabwe Local Currency One of the two primary currencies
supported for transactions.
RPO Recovery Point Objective The maximum acceptable amount of data
loss after an incident (policy: less than 1
hour).
RTO Recovery Time Objective The maximum acceptable time to restore
the service after an outage.
RAG Red/Amber/Green Status A visual system used for quick status
indication (e.g., Compliance Health).
WCAG 2.1
Level AA
Web Content
Accessibility Guidelines
Standard used for ensuring the platform is
accessible, particularly to mobile users.
3. Stakeholder Tenant Requirements & Dashboard
Structures
3.1 Buyer Tenant (Dual Modality Interface)
3.1.1 Individual Buyer Requirements
Module Required Functionality Detailed Specification / Implication
Search
(VIN/Part ID)
High-speed, predictive
search that leverages the
2M dataset and the
integrated VIN decoder.
Search results must show a confidence
score (e.g., "95% Match") when VIN is
used to filter, establishing buyer trust in
the automated selection process. This
confidence score must be based on a
match percentage against vehicle
attributes (engine type, transmission,
trim level).
Checkout Secure payment gateway
with multi-currency
(USD/ZWL) display and
payment processing.
Must handle simultaneous payment
failure and initiate exponential backoff
retry logic for payment attempts
without user re-entry of data. Must
clearly show the locked ZWL/USD
exchange rate used for the transaction,
along with a timestamp of the lock.
Loyalty
Program
Implementation of a tiered
reward points system (e.g.,
Bronze, Silver, Gold).
Buyers earn 1 point for every $1 USD
spent. Points are redeemable for
discounts at checkout. The system
must display the user's current tier and
the progress bar to the next tier
prominently in the user profile section.
Notification
s
Order updates,
promotions, reward point
changes via both in-app
and external SMS
notifications.
SMS templates must be minimalist and
bandwidth-efficient, containing only
critical updates (e.g., tracking link,
status change). The system must utilize
a low-latency SMS gateway capable of
high throughput for immediate status
alerts.
Dispute
Resolution
A clear, guided workflow
for buyers to initiate a
dispute, return, or warranty
claim. The system must
support the upload of
evidence (photos, videos)
up to 20MB per dispute.
Disputes must be logged directly into
the system, triggering an automatic
notification to the Admin Compliance
team and temporarily freezing the
corresponding seller payout. A return
must trigger a pre-paid label generation
via the Logistics Module, minimizing
buyer friction.
Search
Results
Page
Structure
(Granular)
Display filtered parts with
price, ETA, and a
condensed specification
summary.
Interaction: Must feature a persistent,
sticky Filter Bar (bottom sheet on
mobile) allowing users to filter by SRI
Minimum Rating (e.g., 85+), Brand,
Price Range, and Stock Status. Each
product card must display the SRI
Badge (e.g., "Verified Seller: 92%"). The
default sort order must prioritize Price
AND Highest SRI combined.
3.1.2 Enterprise Buyer Requirements (New Segment)
This segment is designed for high-volume corporate users (fleets, large workshops)
requiring complex procurement, multi-user management, and integration with their
existing accounting infrastructure.
Module Required Functionality Detailed Specification / Implication
User
Segmentat
ion
Dedicated login pathway
for verified Enterprise
Accounts.
Enterprises must complete an additional
KYC/vetting process, allowing for credit
facilities and API access not available to
individual buyers. The master account
must manage the assignment of specific
Cost Centers to sub-users for granular
budget tracking.
Credit
Facility
Manageme
nt
System capability to
manage pre-approved
credit limits and payment
terms (e.g., 30-day net).
Automated checks at checkout must
verify that the current order value does
not exceed the remaining credit limit.
Monthly statements must be generated
and emailed to the designated Enterprise
FinOps contact with a detailed
breakdown of all transactions against the
credit line.
API
Integration
(ERP/Acco
unting)
Provision of a secure,
standardized REST API for
seamless accounting
system linkage (e.g., Sage
Pastel, SAP). The API must
support both JSON and
XML formats for
compatibility, and include
Webhook support for realtime order status updates.
The API must support automated fetching
of Invoices, Payment Confirmation
Status, and detailed Line-Item Data
post-transaction to enable zero-touch
reconciliation within the Enterprise's own
ERP. Access must be secured using
OAuth 2.0 protocols for token-based
authentication with auto-refreshing
tokens.
Mandatory
Reference
Fields
Enterprise Checkout must
mandate input for a
Purchase Order (PO)
Number and a Cost Center
Reference field. The PO
number field must support
validation against a preuploaded PO list managed
by the Enterprise master
account.
This data must be included as noneditable fields in the API payload and the
final invoice document, serving as the
primary reconciliation key for the
Enterprise's accounting team. The
absence of a valid PO number must block
checkout for amounts over a predefined
threshold.
Multi-User
& Approval
Workflow
Enterprises must define
multiple Buyer Users under
one master account with
assigned roles (e.g.,
Requester, Approver).
The system requires a defined approval
flow: Junior Buyers can raise an order
request, but a designated Senior
Approver must electronically authorize
transactions over a pre-set spending
threshold (e.g., USD $5,000) before
checkout completion. Approval
requests must be sent via email with
an embedded one-click approval link.
The full approval history must be logged
against the order.
Enterprise
Dashboard
Dedicated dashboard for
tracking large-volume
order history, spend
analysis, and preferred
supplier lists.
Provides aggregated metrics like "Spend
by Vehicle Fleet" or "Parts Category
Volume" to assist the Enterprise in
internal cost control and procurement
analysis. Must include custom
reporting exports (CSV/XLSX), allowing
filtering by PO Number and Cost Center
for immediate auditability.
3.2 Seller Tenant (ERP-Lite Management System)
The Seller Tenant functions as a crucial ERP system, ensuring compliance and
operational excellence.
A. Core Setup & Compliance
Requirement Vetting Process
Requirement
Audit Trail Requirement
Document
Storage
Documents must
be stored in an
encrypted
document store
with strict access
logging. Storage
must use AES256 encryption
at rest.
Every view, download, or modification attempt
on compliance documents must be logged with
timestamp, User ID (Admin), and IP address for
mandatory regulatory audits. The audit log itself
must be immutable and stored in a separate,
append-only ledger.
Compliance
Expiry Alert
The system must
automatically
notify the seller
(Email/SMS) 90,
60, and 30 days
before a critical
document (e.g.,
ZIMRA clearance)
expires.
If a document expires, the seller's account
must be automatically marked as noncompliant, resulting in a 0% Document
Compliance score in the SRI and immediate
exclusion from order routing. The system must
automatically generate a Compliance
Suspension Notice PDF detailing the Violation
Code, Date of Suspension, Mandatory
Rectification Steps, and the Admin
Compliance contact.
Stock
Synchronizati
on
Sellers must be
able to
synchronize their
inventory levels
via a secure API
endpoint (or a
simple file upload
option for lowtech sellers).
The synchronization process must accept
batched updates and execute within a 5-minute
window. An automatic reconciliation process
must run hourly to compare the Seller's
reported stock against historical sales data,
flagging large, unexplained inventory
discrepancies to Admin (potential fraud/stock
dumping). The check must specifically monitor
the ratio of listed inventory to sales velocity
to identify "ghost stock."
B. HR & Payroll
Requirement Specifics Compliance Detail
Shift Hours
Tracking
Clock-in/Clock-out
must capture
employee location
via GPS (mobile
app required). The
app must support
offline clock-in,
syncing the
location and
timestamp when
connectivity is
restored.
Geo-fencing Requirement: The system must
verify the GPS coordinates fall within a
predefined tolerance area (e.g., 500m radius)
of the seller's registered business address to
validate on-site presence. Any violation must
trigger a flag in the payroll report requiring
manual Admin override for payment.
Payroll
Generation
Generate monthly
pay slips including
statutory
deductions (PAYE,
NSSA). The system
must adhere to the
latest Zimbabwe
Labour Act
(Chapter 28:01) for
minimum wage
and overtime
calculations.
The payroll report must be exportable in a
standardized, immutable format (e.g., signed
PDF) and contain detailed line items for all
deductions, meeting ZIMRA requirements for
internal records. Employee master data must
include a mandatory National ID Number field
for tax reconciliation.
C. Seller Dashboard Structure (Granular)
The Seller Dashboard must be a highly actionable single page focusing on the top three
operational priorities: Fulfilment, Inventory, and Compliance.
Section Content Key Interaction/Visualization
1. SRI & Action
Card (Top Left)
Prominent
display of
current SRI
score and
status
(Green/Yellow/
Red). Must
display the last
calculation
time.
Visualization: Large circular dial or gauge for
the SRI. Actionable Button: "View SRI
Breakdown" which links to the detailed factor
scores (Fulfilment, On-Time, etc.) and
corrective advice. If the status is Yellow or Red,
the card must include a prominent, specific
warning (e.g., "Warning: Fulfilment Rate is 65%.
5 more rejections will trigger suspension.").
2. Fulfilment
Queue (Top
Right)
Summary card
showing count
of orders in
critical stages.
Metrics: "New Orders (24h)," "Pending
Shipment (Over 48h)," "Pending Payout."
Interaction: Direct link (e.g., "Go to Fulfilment
Ledger") for immediate action. Orders must be
color-coded by age: over 48 hours must turn
Red.
3. Inventory
Management
View
Primary data
grid of all linked
products and
stock levels.
Interaction: Inline Editing of Pseller and
Inventory Count directly in the grid (requires API
quick update). Alerts: A mandatory "Top 5 Low
Stock Alerts" card displaying items where
stock is ≤5 units, linking directly to the
Procurement module. The grid must allow bulk
CSV export/import for mass updates.
4. Compliance
Health
Status of key
regulatory
documents.
Metrics: Simple RAG (Red/Amber/Green)
status for ZIMRA, TIN, and KYC. Action:
Prominent "Upload/Update Documents"
button. Must show the nearest Expiration Date
in a contrasting color if <60 days away. Must
also display a mandatory Audit Score,
reflecting internal compliance checks
conducted by the Admin team.
3.3 Super Admin Tenant
The control panel for platform governance and financial health.
Module Strategic/Technical
Detail
Financial Reconciliation & Audit
Admin
Dashboard
Real-time Alert
System for highpriority events (SRI
drops below 70,
payment gateway
failure, suspected
fraud). The system
must utilize a RoleBased Access
Control (RBAC)
model. Defined roles
includes: FinOps
Analyst,
Compliance
Manager, Logistics
Coordinator, and
Tech Support.
KPIs must include a Daily Payout vs.
Commission Revenue Reconciliation Report
that cross-references all gateway fees, seller
payouts, and platform revenue, identifying any
variances exceeding 0.1%. The reconciliation
report must be auditable up to the minute, not
just end-of-day.
Accounting
& Payouts
Central view of all
platform
transactions,
manage seller
payouts, tax
remittance reports.
Must include a
workflow for
handling
Chargebacks and
Refunds where
funds are
automatically frozen
from the seller's
upcoming payout if a
chargeback is
initiated.
Must generate ZIMRA VAT Reports (if
applicable) summarizing sales and
commission revenues for quarterly filing,
exportable in the regulator's preferred
electronic format (e.g., XML/PDF). The system
must track and report tax liabilities separately
for USD and ZWL components.
Dispute
Manageme
nt
Workflow for Admin
to mediate disputes
between Buyer and
Seller. The system
must support two
dispute paths: (1)
Fault-Based:
impacting SRI, and
(2) No-Fault:
logistics issues
which do not impact
SRI but track
platform liability.
Disputes must be assigned to specific Admin
team members via the RBAC system. The
system must track the time-to-resolution KPI.
Admin must be able to approve or deny
returns, impacting the Seller's SRI score only
for Fault-Based issues. The maximum
resolution SLO is 7 days.
Admin Alert
System
(Granular)
The alert system
must use three
distinct priority tiers,
displayed in a
dedicated, nondismissible widget
on the main
dashboard.
Tier 1 (Critical - Red): Payment Gateway
Disconnection, SRI Violation (Seller drops
below 70), Unauthorized RBAC Attempt, VIN
Decoder API Failure (System Fallback
Initiated). Tier 2 (High - Orange): Anti-Sniping
Triggered, 5+ Custom Product Requests
Pending, Document Expired (Immediate
suspension required), High Inventory
Variance Detected (≥10% discrepancy). Tier
3 (Low - Yellow): Variance in Daily Payout Rec
Report (>0.1%), Low stock alerts from multiple
high-SRI sellers, Logistics Partner API
Latency Exceeds 500ms.
Financial
Reconciliati
on View
(Granular)
Dedicated module
for tracking financial
flow and identifying
discrepancies.
Layout: Table view showing Transaction ID,
Gross Value, Expected Platform Revenue,
Actual Platform Revenue, Variance (%). The
view must include the exact exchange rate
used and the time of transaction. Filtering:
Mandatory filters must include Date Range,
Seller ID, and Variance >0.01%. Variance must
be highlighted using a Red background if
>0.1%. The system must allow the FinOps
Admin to annotate and approve (sign-off) on
minor variances, moving the transaction to a
"Cleared" state.
3.4 Logistics and Shipping Service Tenant (New Module)
A dedicated operational module to manage shipment execution and tracking.
Module Required Functionality Integration Specification
Carrier
Managem
ent
Admin module to define and
configure multiple local logistics
providers.
Requires the ability to store API keys,
rate calculation endpoints, and
service level agreements (SLAs) for
each carrier. The system must
support failover carriers for regions
where the primary carrier cannot
deliver, automatically selecting the
backup carrier based on the shortest
predicted ETA after initial failure.
Rate
Calculatio
n
Dynamic calculation of shipping
cost and estimated time of
arrival (ETA) at the checkout
stage. The rate must be
determined using a 3-tiered
weight/dimension-based
matrix and must be fully cached
to minimize checkout latency.
The matrix must define costs for
Small (L<30cm, W<30cm,
H<30cm, Wt<5kg), Medium,
and Large packages.
The system must query live carrier
APIs based on package
dimensions/weight (from 2M
dataset) and distance, ensuring
accurate, real-time quotes are used
for ETA generation. The calculation
must account for the Seller's
historical On-Time Delivery Rate to
adjust the promised ETA to the buyer
(padding).
Tracking
Integratio
n
Universal tracking dashboard for
Admin and Buyer. Tracking must
be linked to the order via a
globally unique, immutable
identifier (e.g., UUID).
Requires a webhook listener
endpoint to receive real-time status
updates from integrated carrier APIs.
If webhooks are unavailable, a
scheduled job must poll the carrier
API every 30 minutes for updates.
Tracking status must use
standardized system codes (e.g.,
"Pending Pickup," "In Transit,"
"Delivered," "Exception").
4. Design & UX/UI Specification
4.1 UI/UX Style Guide and Localization
Element Specification Accessibility and Network Resilience
Accessibili
ty (A11y)
All components must
adhere to WCAG 2.1
Level AA standards
(color contrast,
keyboard navigation).
All images must have
descriptive alt tags.
Focus on large, clear touch targets for
buttons and links, especially crucial for
mobile users with varying device quality.
Input fields must support voice input where
available on the device, particularly in
search.
Localizatio
n
Primary language is
English. Future-proofing
for Shona/Ndebele
translations via a
content management
system (CMS).
All text strings in the frontend must be
externalized using an i18n library to
facilitate future localization without code
changes. All date/time formats must adhere
to local Zimbabwean standards
(DD/MM/YYYY).
Error
Handling
UI
All transactional
failures (payment,
inventory) must display
clear, non-technical
error messages in a
modal window.
Never use JavaScript alert()/confirm().
Error modals must provide specific,
actionable advice (e.g., "Payment failed.
Please check your card details or try
Ecocash."). Critical errors must log the full
stack trace to the Admin error monitoring
service.
Offline
Mode
(PWA)
The Buyer Tenant
should implement basic
Progressive Web App
(PWA) caching for core
pages. Service
Workers must be used
to cache search results,
product listings, and
cart contents for
reliable read access.
Allows users to browse categories and past
searches even in areas of low network
connectivity (2G/3G), improving service
availability. The PWA should queue
outbound requests (e.g., "Add to Cart") and
execute them upon reconnection, providing
visual confirmation of pending actions.
5. Technical Specification & Tool Stack
5.1 System Architecture and Data Management
Aspect Requirement Policy/Procedure
API
Standards
All public and internal APIs
must be documented using
OpenAPI (Swagger)
specifications. All APIs
must be secured using
HTTPS (TLS 1.2+).
Mandatory API versioning (e.g., /api/v1/)
to ensure non-breaking changes and
seamless migration for integrated
partners (Logistics, Finance, Enterprise
ERPs). Rate limiting must be enforced on
all public endpoints to prevent DoS
attacks.
Database
Structure
PostgreSQL with strict
relational constraints and
foreign keys for financial
data (Transactions,
Ledgers). Complex data
structures (e.g., nested
compatibility arrays) must
be serialized to JSON
strings within the database
for efficient querying and
data integrity.
Sensitive fields (e.g., unencrypted
contact numbers, employee salaries)
must use column-level encryption in the
database. All developer access to
production data must be logged and
require multi-factor authentication. Key
data stores should be: PostgreSQL
(Transactional/Financial) and
Elasticsearch (Search/Master Data
Indexing).
Microservi
ces
Pattern
The entire application must
be built using a
microservices pattern to
isolate failures and ensure
resilience across the
different tenant systems
(Buyer, Seller, Admin,
Pricing).
The architecture must include an API
Gateway for routing and authentication,
and utilize a Service Discovery
mechanism (e.g., Consul/Etcd) to
manage internal service communication,
ensuring high availability and fault
tolerance.
Data
Migration
Plan
The 2M Master Dataset
must be migrated first.
The migration process must
include a checksum
validation on all records
against the source data.
Migration strategy requires a full
validation suite run post-migration to
ensure 100% data integrity before
activating the Seller Tenant. A mandatory
48-hour Read-Only Lock must be applied
to the Master Data post-migration for final
QA sign-off.
Disaster
Recovery
(DR)
Implement a formal
Disaster Recovery Plan with
defined RTO (Recovery Time
Objective) and RPO
(Recovery Point Objective).
RTO is 4 hours (max time
to restore service). RPO
Daily full database backups and
continuous transaction logs are required,
stored geographically separate from the
primary data center. A mandatory, nonnegotiable quarterly failover test is
must be less than 1 hour
(max data loss tolerance).
required, documented and signed off by
the CTO.
Scalabilit
y
Backend services must be
deployed in a
containerized cluster
(Kubernetes/ECS) with
horizontal auto-scaling
enabled on the Pricing
Algorithm and Order
Routing services.
Autoscaling metrics must
be based on both CPU
utilization (≥75%) and
Request Latency (≥300ms
sustained).
Anticipate seasonal peaks (e.g., end-ofyear vehicle inspection spikes) and
ensure infrastructure can scale up based
on CPU utilization metrics. Use Redis for
rate limiting, session storage, and the
high-speed pricing data cache.
6. Metrics, KPIs, and Reporting
6.1 Audit, Security, and Compliance KPIs
In addition to operational KPIs (GMV, SRI), the platform requires stringent monitoring of
compliance health.
KPI Formula / Definition Monitoring
Frequency
SRI Violation
Rate
(Number of Sellers below SRI 70 / Total
Active Sellers).
Hourly (Monitored by
Algorithm Service).
Document
Expiry Rate
(Critical Documents Expiring in 30 Days /
Total Seller Documents).
Daily (Monitored by
Compliance Admin).
Failed
Transaction
Rate
(Failed Payment Attempts / Total Checkout
Initiations).
Real-time (Monitored
by FinOps Admin).
Time-toResolution
(Dispute)
Average time taken from dispute initiation
to resolution (in hours).
Weekly (Monitored by
Operations Manager).
Security Log
Anomaly
Number of login failures or unauthorized
access attempts detected by logging
system.
Real-time (Monitored
by Security Team).
7. Security and Regulatory Compliance
This section outlines the mandatory security posture and specific regulatory
requirements for operating in the Zimbabwean market.
Area Requirement Detail Mitigation / Enforcement
Data
Sovereignty
All production data
(especially customer PII
and financial records) must
be hosted within a
jurisdiction that complies
with local Zimbabwean
data protection laws.
Use of regional data centers and strict
adherence to data residency
requirements, preventing crossborder data transfer without explicit,
auditable consent.
PII & User
Authentication
User passwords must be
stored using a one-way
hashing algorithm (e.g.,
Argon2 or bcrypt) with a
high computational cost.
Multi-Factor Authentication
(MFA) must be mandatory
for all Seller and Admin
accounts.
Implement automated breach
detection and user notification if
password hashes are suspected of
compromise. Password hashing must
use Argon2id with minimum
parameters: memory cost 65536, time
cost 3, and parallelism 4. The MFA
system must support both SMS and
Authenticator App methods.
Payment Card
Industry (PCI)
Compliance
Since the platform handles
card data via gateways, the
system must adhere to PCIDSS Level 2 standards. No
raw card data should be
stored on Simbi market
servers.
Use of tokenization services provided
by the payment gateway and ensuring
all payment processing flows bypass
the application server entirely (Direct
Post or iFrame integration). Annual
security audits by a certified QSA. All
payment logs must be scrubbed of PII
after 90 days.
Change
Management
All software deployments
to the Production
environment must follow a
Implementation of a four-eyes
principle (separate developer and
approver) for all code merges and
formal, documented
change management
process.
infrastructure changes. Automated
Unit, Integration, and End-to-End tests
must pass with a minimum 95% code
coverage before deployment.
Deployment must utilize a
Blue/Green or Canary strategy to
minimize service interruption.
Regulatory
Reporting
(ZIMRA)
The system must maintain
an immutable ledger of all
commission revenue and
associated VAT/Tax
components, segregated by
currency.
The Admin Tenant must produce a
ZIMRA-compliant Tax Report on the
first day of every quarter, containing
aggregated, tamper-proof data ready
for submission. The report must
explicitly detail the Seller's VAT
number, the Reporting Period, Total
Taxable Income (USD/ZWL), and
Total VAT Payable (USD/ZWL).
Failure to generate this report
automatically triggers a Tier 1 (Critical)
alert.