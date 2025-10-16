SRI = (40% × Fulfillment Rate) + (40% × On-Time Delivery) + (15% × Return/Defect Rate) + (5% × Document Compliance)
```

### **Factor Details**

| Factor | Weight | Calculation | Penalty |
|--------|--------|-------------|---------|
| **Fulfillment Rate** | 40% | Orders Accepted / (Accepted + Rejected)<br>*12-hour response window* | <70% = excluded from pricing algorithm<br><50% = 7-day shadow ban |
| **On-Time Delivery** | 40% | Delivered On-Time / Total Delivered<br>*Based on quoted ETA* | Increased ETA padding shown to buyers<br>Can appeal for 3rd-party delays |
| **Return/Defect Rate** | 15% | Customer Returns / Total Delivered | >5% = admin investigation<br>Confirmed counterfeit = -30 points + audit |
| **Document Compliance** | 5% | Binary: 1.0 if all valid, 0.0 if not | Expired docs = immediate suspension |

---

## Communication Flow Between Stakeholders

### **Flow 1: Standard Purchase (Individual Buyer)**
```
BUYER → PLATFORM → SELLER → LOGISTICS → BUYER

1. Buyer enters VIN
   ↓
2. Platform decodes VIN via API
   ↓
3. Platform queries 2M Master Database for compatible parts
   ↓
4. Platform runs Dynamic Pricing Algorithm:
   - Filters sellers with SRI ≥70
   - Selects lowest Pseller
   - If tie, chooses highest SRI
   - Checks inventory availability
   - Calculates Pdisplay = min(Pseller) + commission
   ↓
5. Buyer sees search results with:
   - Price (with locked exchange rate)
   - ETA (adjusted for seller's on-time rate)
   - SRI badge (e.g., "Verified Seller: 92%")
   ↓
6. Buyer adds to cart & checks out
   ↓
7. Platform locks exchange rate + timestamps
   ↓
8. Payment gateway processes payment
   - Retry logic on failure
   - SMS/in-app notification sent
   ↓
9. Order routed to selected seller
   - Seller has 12 hours to accept/reject
   - Non-response = rejection (impacts SRI)
   ↓
10. Seller accepts → updates stock → prepares shipment
    ↓
11. Platform generates shipping label via Logistics Module
    - Queries carrier API for rate/ETA
    - Creates tracking number (UUID)
    ↓
12. Seller ships → Logistics provider updates tracking
    - Webhook sends real-time updates to platform
    - Or polling every 30 minutes
    ↓
13. Platform notifies buyer of each status change
    ↓
14. Delivery confirmed
    ↓
15. Platform calculates SRI impact:
    - Was it on-time?
    - Was it accepted within 12 hours?
    ↓
16. Weekly payout scheduled to seller
    - Gross sale - platform commission - gateway fee
    - Audit report generated with transaction details
```

---

### **Flow 2: Enterprise Purchase with Approval**
```
ENTERPRISE USER → APPROVAL WORKFLOW → PLATFORM → SELLER → ERP INTEGRATION

1. Junior buyer (Requester) searches parts via API or web interface
   ↓
2. Adds to cart with mandatory fields:
   - PO Number (validated against pre-uploaded list)
   - Cost Center allocation
   ↓
3. Cart total >$5,000 threshold
   ↓
4. Platform triggers approval workflow:
   - Email sent to designated Senior Approver
   - One-click approval link embedded
   ↓
5. Senior Approver reviews & approves
   - Logged in approval history
   ↓
6. Credit check runs:
   - Current order + outstanding balance < credit limit?
   ↓
7. Order proceeds through standard fulfillment (same as Flow 1)
   ↓
8. Platform generates invoice with:
   - PO Number
   - Cost Center
   - Line-item details
   ↓
9. API webhook sends invoice data to enterprise ERP:
   - OAuth 2.0 secured connection
   - JSON/XML format
   - Auto-refresh tokens
   ↓
10. Enterprise ERP receives:
    - Invoice
    - Payment confirmation
    - Delivery status
    - Zero-touch reconciliation achieved
    ↓
11. Monthly statement emailed to FinOps contact
```

---

### **Flow 3: Seller Onboarding & Compliance**
```
SELLER → ADMIN → PLATFORM → ONGOING MONITORING

1. Seller submits application via platform
   ↓
2. Uploads documents:
   - ZIMRA clearance
   - TIN certificate
   - KYC documents (National ID, business registration)
   ↓
3. Admin reviews documents:
   - Stored with AES-256 encryption
   - Access logged (timestamp, User ID, IP)
   ↓
4. Admin verifies authenticity:
   - Cross-check with ZIMRA database
   - Verify business address
   ↓
5. Admin approves → Seller account activated
   ↓
6. Seller links products to Master Database:
   - Must use existing MasterPartID
   - Custom products require 3 images + OEM PDF
   ↓
7. Admin reviews custom product requests:
   - 72-hour SLO
   - Counterfeit verification check
   - Approve/reject with reason
   ↓
8. Ongoing compliance monitoring:
   - Automated alerts at 90/60/30 days before doc expiry
   - Hourly SRI calculation
   - Daily stock reconciliation
   ↓
9. If document expires:
   - Auto-suspension triggered
   - Compliance Suspension Notice PDF generated
   - Seller excluded from order routing
   - SRI Document Compliance = 0%
   ↓
10. Seller uploads renewed documents → Admin reviews → Reactivation
```

---

### **Flow 4: Dispute Resolution**
```
BUYER → PLATFORM → ADMIN → SELLER → RESOLUTION

1. Buyer initiates dispute via dashboard:
   - Selects reason (wrong part, defective, counterfeit)
   - Uploads evidence (photos/videos up to 20MB)
   ↓
2. Platform logs dispute:
   - Auto-notification to Admin Compliance team
   - Seller payout frozen for this order
   ↓
3. Admin assigns dispute to team member (RBAC)
   ↓
4. Admin reviews evidence:
   - Contacts seller for response
   - May request additional documentation
   ↓
5. Admin determines fault:
   - **Fault-Based**: Seller error (wrong part, counterfeit)
     → Impacts SRI Return/Defect Rate
     → If counterfeit confirmed: -30 SRI points + forensic audit
   - **No-Fault**: Logistics issue (carrier delay, damage in transit)
     → No SRI impact
     → Platform liability tracked
   ↓
6. Admin approves return:
   - Platform generates pre-paid return label
   - Buyer ships part back
   ↓
7. Seller receives returned part
   ↓
8. Platform processes refund to buyer
   ↓
9. If Fault-Based:
   - Seller's SRI updated
   - If SRI drops below 70 → excluded from pricing algorithm
   - If SRI drops below 50 → 7-day shadow ban
   ↓
10. Dispute closed within 7-day SLO
    - Time-to-resolution tracked as KPI
```

---

### **Flow 5: Dynamic Pricing Algorithm Execution**
```
TRIGGERED BY: Buyer search query

1. Buyer searches for part (by VIN or Part Number)
   ↓
2. Platform queries Master Database (2M parts):
   - Full-text search with fuzzy matching
   - Returns MasterPartID + compatibility data
   - Search latency <100ms for 99% of queries
   ↓
3. Platform queries all sellers offering this MasterPartID
   ↓
4. Filters sellers:
   - SRI ≥70 (hard requirement)
   - Stock available >0
   - Seller account status = Active
   ↓
5. Retrieves from cache (Redis) for each eligible seller:
   - Pseller (wholesale price)
   - Current inventory count
   - SRI score
   ↓
6. Pricing algorithm executes:
   - Finds min(Pseller) among eligible sellers
   - If tie: selects highest SRI
   - If highest SRI has insufficient inventory:
     → Moves to next best price/SRI combination
   ↓
7. Calculates Pdisplay:
   - Pdisplay = min(Pseller) + (Pseller × Crate)
   - Crate is category-specific (5-10%)
   ↓
8. Multi-currency conversion:
   - If Pseller in USD, calculate ZWL using daily RBZ rate
   - If RBZ feed fails: use previous day's rate + Tier 1 alert
   - Lock exchange rate for display
   ↓
9. Returns result to buyer:
   - Pdisplay (with USD and ZWL options)
   - Locked exchange rate + timestamp
   - Estimated delivery time (ETA)
   - ETA adjusted based on seller's on-time delivery rate:
     → If rate <80%: pad ETA by 1-2 days
   - Seller SRI badge
   ↓
10. Buyer adds to cart → exchange rate remains locked
    ↓
11. At checkout completion:
    - Selected seller receives order notification
    - Platform deducts commission:
      → Gross sale = Pdisplay
      → Platform commission = Pdisplay - Pseller
      → Net seller payout = Pseller - payment gateway fee
    ↓
12. Audit report generated:
    - Transaction ID
    - Invoice value (Pdisplay)
    - Seller payout (Pseller)
    - Commission (USD/ZWL)
    - Gateway fee
    - Seller TIN
```

---

### **Flow 6: Anti-Sniping Price Protection**
```
TRIGGERED BY: Seller attempts frequent price changes

1. Seller updates Pseller via dashboard or API
   ↓
2. Platform logs price change:
   - Timestamp
   - Old price → New price
   - Product MasterPartID
   ↓
3. Platform checks rate limit:
   - Has seller made 3+ price updates for this product in past hour?
   ↓
4. If YES → Anti-sniping triggered:
   - Alert sent to Admin dashboard (Tier 2)
   - Seller's pricing API locked for 24 hours
   - In-app notification sent to seller:
     → "Your pricing API has been locked for excessive updates"
   ↓
5. Admin reviews activity:
   - Manual review for suspicious patterns
   - Check if seller is trying to game the algorithm
   ↓
6. Platform tracks violations:
   - 3 strikes in 90 days = permanent ban from inline editing
   - Seller must contact admin for manual price changes
   ↓
7. After 24-hour cooling period:
   - Pricing API unlocked
   - Seller receives notification
```

---

### **Flow 7: Logistics Integration**
```
TRIGGERED BY: Order placed

1. Buyer completes checkout
   ↓
2. Platform retrieves package dimensions from Master Database:
   - Length, Width, Height, Weight
   ↓
3. Platform determines package tier:
   - Small: L<30cm, W<30cm, H<30cm, Wt<5kg
   - Medium: (defined in system)
   - Large: (defined in system)
   ↓
4. Platform queries primary carrier API:
   - Submits: Package size, weight, origin (seller address), destination (buyer address)
   - Requests: Shipping cost + ETA
   ↓
5. If primary carrier API fails:
   - Automatic failover to backup carrier
   - Selects carrier with shortest ETA
   - Tier 2 alert sent to Admin
   ↓
6. Platform receives quote:
   - Shipping cost
   - Estimated delivery date (raw ETA)
   ↓
7. Platform adjusts ETA based on seller's on-time delivery rate:
   - If rate ≥90%: show raw ETA
   - If rate 80-89%: add 1 day padding
   - If rate 70-79%: add 2 days padding
   - If rate <70%: seller excluded (shouldn't reach this point)
   ↓
8. Platform caches shipping rate to minimize checkout latency
   ↓
9. Seller ships order:
   - Provides tracking number to platform
   - Platform creates globally unique order identifier (UUID)
   ↓
10. Platform sets up tracking integration:
    - If carrier supports webhooks: register webhook listener
    - If not: schedule polling job every 30 minutes
    ↓
11. Carrier provides status updates:
    - Pending Pickup → In Transit → Out for Delivery → Delivered
    - Platform standardizes status codes
    ↓
12. Platform notifies buyer of each status change:
    - SMS + in-app notification
    - Tracking link provided
    ↓
13. Upon delivery:
    - Carrier confirms delivery timestamp
    - Platform compares to promised ETA
    - Updates seller's on-time delivery rate
    - Impacts SRI calculation (40% weight)
    ↓
14. If late delivery:
    - Seller can appeal:
      → Upload evidence of 3rd-party delay (weather, carrier issues)
      → Admin reviews appeal
      → If approved: no SRI penalty
```

---

### **Flow 8: Weekly Seller Payout**
```
TRIGGERED BY: Scheduled weekly job

1. Platform queries all delivered orders from past week
   ↓
2. Filters orders:
   - Delivery confirmed (not in dispute)
   - No pending chargebacks
   ↓
3. For each seller, calculates total payout:
   - Sum of all Pseller amounts
   - Minus platform commissions
   - Minus payment gateway fees
   ↓
4. Platform generates audit report per seller:
   - Transaction ID list
   - Gross sale values (Pdisplay)
   - Seller payouts (Pseller)
   - Commission breakdown (USD/ZWL)
   - Gateway fees
   - Net payout amount
   ↓
5. Admin FinOps team reviews reconciliation report:
   - Checks for variances >0.1%
   - Flags highlighted in red background
   - Annotates minor variances
   - Approves payout batch
   ↓
6. Platform initiates bank transfers:
   - USD payouts to seller USD accounts
   - ZWL payouts to seller ZWL accounts
   ↓
7. Seller receives payout notification:
   - Email with breakdown PDF
   - In-app notification
   ↓
8. Platform archives payout records:
   - Immutable ledger entry
   - Available for quarterly ZIMRA tax reporting

   Summary of Inter-Stakeholder Communication
Buyer ↔ Platform

VIN submission → part recommendations
Search queries → dynamic pricing results
Checkout → payment processing
Order tracking → delivery notifications
Disputes → evidence submission

Platform ↔ Seller

Order routing → fulfillment notifications
Stock synchronization → inventory updates
SRI calculations → performance alerts
Compliance monitoring → document expiry warnings
Payouts → weekly remittance + reports

Platform ↔ Admin

Financial reconciliation → variance reports
Dispute escalation → mediation workflows
Alert system → tiered notifications
Compliance audits → seller vetting + ongoing monitoring
Tax reporting → ZIMRA quarterly submissions

Seller ↔ Logistics

Shipment creation → tracking number assignment
Status updates → webhook/polling notifications
Delivery confirmation → on-time rate calculation

Enterprise Buyer ↔ ERP

API integration → order placement
Invoice retrieval → payment status
Real-time webhooks → order updates
Monthly statements → reconciliation data