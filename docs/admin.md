Simbi Market – Admin Requirements Overview

This document summarizes and explains the detailed administrative (Super Admin) requirements outlined in the 
Simbi Market Software Requirements Document (SRD). It focuses on how the Super Admin Tenant operates, its 
modules, workflows, and control mechanisms for platform governance, compliance, and financial management.

1. Overview of the Super Admin Tenant

The Super Admin Tenant acts as the central command and governance system of Simbi Market. 
It oversees all operational, financial, and compliance activities, ensuring transparency, 
stability, and adherence to local regulatory standards. It includes dashboards, reporting tools, 
alert mechanisms, and access controls for various admin roles.

2. Admin Roles and Access Control (RBAC)

The system enforces a Role-Based Access Control (RBAC) model. Each admin role has specific responsibilities and 
access privileges, ensuring segregation of duties and reducing security risks.

Key Roles:
- FinOps Analyst: Manages financial reconciliation, payouts, and commission revenue tracking.
- Compliance Manager: Oversees document validity, regulatory reports, and seller compliance.
- Logistics Coordinator: Manages shipping partners, tracks deliveries, and monitors logistics SLAs.
- Tech Support: Handles system alerts, error logs, and API/service uptime monitoring.
3. Admin Dashboard & Real-Time Alerts

The Admin Dashboard provides a unified real-time view of critical system activities and alerts. 
It uses a three-tier alert system to categorize events by severity.


Tier 1 (Critical – Red): Payment gateway failure, SRI violation (seller drops below 70), 
unauthorized access attempts, VIN decoder API failure.
Tier 2 (High – Orange): Document expiration, anti-sniping violation, stock discrepancies.
Tier 3 (Low – Yellow): Financial variance <0.1%, multiple low-stock alerts, slow logistics API.

4. Financial Management and Reconciliation

This module governs all monetary transactions, commissions, and payout processes. It ensures 
regulatory transparency and accuracy across all financial activities.


Key Functions:
• Tracks all platform transactions (USD/ZWL) and identifies payout or commission discrepancies.
• Generates Daily Payout vs. Commission Reconciliation Reports.
• Produces VAT and tax reports in ZIMRA-compliant format.
• Manages chargebacks and refunds, automatically freezing seller payouts under dispute.
• Provides variance tracking with threshold alerts (>0.1%).
5. Dispute Management Workflow

Admin mediates disputes between buyers and sellers. There are two dispute types:
1. Fault-Based: Seller responsible; impacts SRI score.
2. No-Fault: Logistics-related; tracked separately for platform liability.
Each dispute is assigned to a specific admin. Resolution time is monitored with an SLA of 7 days.

6. Financial Reconciliation View

Provides a granular breakdown of each transaction including Transaction ID, Gross Value, Platform Revenue, 
Variance, and Exchange Rate applied. Admins can annotate and approve small discrepancies before marking 
transactions as “Cleared.” Filters include Date Range, Seller ID, and Variance >0.01%.

7. Logistics and Carrier Management

The admin can configure and manage logistics providers, define pricing matrices, and handle failover carriers 
in case of delivery partner failure. Admin ensures carrier APIs are functional and verifies real-time tracking 
data for accuracy.

8. Compliance and Reporting

Admin ensures that the system meets regulatory obligations, including:
• Generating VAT and Tax remittance reports for ZIMRA.
• Ensuring all financial and seller compliance records are up to date.
• Monitoring MFA enforcement and password policy compliance.
• Managing audit logs for all admin actions (immutable and timestamped).

9. Key Admin KPIs and Monitoring Metrics

• SRI Violation Rate – hourly monitoring of sellers below threshold 70.
• Document Expiry Rate – daily monitoring of compliance certificates.
• Failed Transaction Rate – real-time tracking for payment performance.
• Dispute Resolution Time – weekly performance measurement.
• Security Log Anomalies – real-time detection of unauthorized access.

10. Summary

The Super Admin Tenant is designed as a mission-critical control system within Simbi Market. It combines 
financial, compliance, and operational oversight to ensure high integrity, trust, and performance across 
the platform. With real-time analytics, automated reconciliation, and tiered alerts, it guarantees transparent 
governance aligned with Zimbabwean regulatory and market conditions.

