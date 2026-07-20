
# Product Requirement Document (PRD): Admin Panel Web Application (V1 – Manual Assignment Engine)

## 1. Product Overview

The Admin Panel is the central control center for the Urban-assist marketplace operations team, providing end‑to‑end visibility and control over bookings, providers, customers, finances, and platform configuration. [xgenious](https://xgenious.com/home-services-marketplace-development-features-implementation/)
For V1, the strategic focus is on a **Manual Assignment Engine**, where authorized admins manually assign and reassign jobs, supported by rich data, vetting, and audit trails; later versions will add an ML/recommendation engine without changing core modules. [rigbyjs](https://www.rigbyjs.com/blog/services-marketplace-features)

***

## 2. Target Audience

- **Platform administrators and operations managers** responsible for supply–demand balance, quality, and daily execution. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/47802782/27141004-aac4-49e5-a922-8e0e031d9308/AdminPanelPRD.md?AWSAccessKeyId=ASIA2F3EMEYEQQ42BHKW&Signature=i3mc7A8KvHXSSSsedmirDfGRwPQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIF46fTyQHObWSGKon%2B6pN8IxbJfi9r8Sb3OFrGo0t7%2BNAiApk3UhPKwYVMDaKAVGESLEd3M5%2BYp%2BVHzVkC8Sk%2BENayr8BAii%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMcylfWV%2FU9jElbEyOKtAEZuH0%2B8Eio%2BdM4CqfvWsZsU3rXSxgxd6uWbTl6cqIrXrEUMf6lKKybY%2FO0ZiQaxewpUOAJHSuq3ABpix3wd%2BkR7QDSG9K%2Bhfzo5OM8JBqlPzdKl3OXsJ4eX6W421muAr4s%2BuLixbwFtDAgd9TlTXL6FKMDvSHVyhwz0lB1P3RzcnLSRCCqg7DFjZhkKR5NKYkFC1fFjlsMP9ZbhQdr4Thmh5GBj%2FKHGZoOVWr4HcT424%2BJNjz2JbHQLlTgg%2F84fm96NgyRrSqlEUnB2AZe62V7WF1%2BZYGZOq1D6eKaxfgb6apPnoday87%2B8nBk%2FqukcJ7%2BWuffAqIqNEncN9oY2Ikm2CvlyNJDJdKG%2FXdXcPEbfXLcF3N0u2sMGmc%2F42usH1DHdidOPyenjwMpOSe%2BzRvvtnXIh0A9IO3T1R8fTgPzQFtbbu%2B6s%2BWO0qEtQgEp7lu6qQt8M3K4FVnjxjpg6yi%2BXuBqk7VHwTcU5XJPnuqILHeDPhDfznzTup3zw%2FyMW6DZP8L0Mdl%2Bna7cSheQWYPURT%2BJx3qCiPYGyIv%2FFgSYHS%2BFKpN%2BeNNapLu200JcegT5TerPRZcCc%2B73mbH8qci05v71%2BYbGkTjrfEuE4X6TT4HhaGTwDTa3XIr11m85Qcx0XKgQW2gOmoXXDNTjYFEl5fLwKuZba7%2B0eHLSNoDKe8EM6UBWzYIDcLSQ5ji4EH%2BRTghVP0WELEzXNleqO6uT11%2FL%2BJaicNewGJSRGBe9jRt7NqTdL%2FM6JT4fDv%2B9mAkXtNp7tEAcd7TryHWqsIVKDCVv%2FfSBjqZAQChvj31aNY1BNcCepknHDy6LfqrM%2BWjLbgkMEUdYf%2FNe0eZshVSt0q1ephnEHjVVO4BXaPjjBwKdUnRjctDoKvGsWxu5Ylk6HWuOyt%2BD%2BS4anV2fV5u3eiEs5uddhOoIXCRC10WOL794%2FRg5ADZYeK6h%2B6%2Fe39v6XP4eAnZ%2BwpK65DAUf9g2tKQHvy2HTOMDHFdMxVx40plBA%3D%3D&Expires=1784540520)
- **Customer support and finance teams** handling disputes, refunds, payouts, and financial reporting. [xgenious](https://xgenious.com/home-services-marketplace-development-features-implementation/)

***

## 3. Key Functional Requirements

### 3.1 Admin Roles & RBAC

- Support distinct admin roles: `super_admin`, `ops_admin`, `finance_admin`, `support_agent`, and `read_only_analyst` to separate sensitive configuration from routine operations and support. [supaexplorer](https://supaexplorer.com/dev-notes/10-real-world-rls-patterns-for-supabase-with-policy-snippets.html)
- Implement role-based access control so only the appropriate roles can perform high‑risk actions (commission changes, payouts, assignment overrides, catalog edits), while all admin actions are logged for audit. [supabase](https://supabase.com/blog/postgres-audit)

***

### 3.2 Booking Management & Manual Assignment Engine

- **Booking Overview:** Filterable list of all customer bookings, with filters for status, date range, category, postcode, assigned provider, and flags (e.g. dispute, high value).  
  The list must support quick drill‑down into booking details, timeline, and current assignment state. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/47802782/27141004-aac4-49e5-a922-8e0e031d9308/AdminPanelPRD.md?AWSAccessKeyId=ASIA2F3EMEYEQQ42BHKW&Signature=i3mc7A8KvHXSSSsedmirDfGRwPQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIF46fTyQHObWSGKon%2B6pN8IxbJfi9r8Sb3OFrGo0t7%2BNAiApk3UhPKwYVMDaKAVGESLEd3M5%2BYp%2BVHzVkC8Sk%2BENayr8BAii%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMcylfWV%2FU9jElbEyOKtAEZuH0%2B8Eio%2BdM4CqfvWsZsU3rXSxgxd6uWbTl6cqIrXrEUMf6lKKybY%2FO0ZiQaxewpUOAJHSuq3ABpix3wd%2BkR7QDSG9K%2Bhfzo5OM8JBqlPzdKl3OXsJ4eX6W421muAr4s%2BuLixbwFtDAgd9TlTXL6FKMDvSHVyhwz0lB1P3RzcnLSRCCqg7DFjZhkKR5NKYkFC1fFjlsMP9ZbhQdr4Thmh5GBj%2FKHGZoOVWr4HcT424%2BJNjz2JbHQLlTgg%2F84fm96NgyRrSqlEUnB2AZe62V7WF1%2BZYGZOq1D6eKaxfgb6apPnoday87%2B8nBk%2FqukcJ7%2BWuffAqIqNEncN9oY2Ikm2CvlyNJDJdKG%2FXdXcPEbfXLcF3N0u2sMGmc%2F42usH1DHdidOPyenjwMpOSe%2BzRvvtnXIh0A9IO3T1R8fTgPzQFtbbu%2B6s%2BWO0qEtQgEp7lu6qQt8M3K4FVnjxjpg6yi%2BXuBqk7VHwTcU5XJPnuqILHeDPhDfznzTup3zw%2FyMW6DZP8L0Mdl%2Bna7cSheQWYPURT%2BJx3qCiPYGyIv%2FFgSYHS%2BFKpN%2BeNNapLu200JcegT5TerPRZcCc%2B73mbH8qci05v71%2BYbGkTjrfEuE4X6TT4HhaGTwDTa3XIr11m85Qcx0XKgQW2gOmoXXDNTjYFEl5fLwKuZba7%2B0eHLSNoDKe8EM6UBWzYIDcLSQ5ji4EH%2BRTghVP0WELEzXNleqO6uT11%2FL%2BJaicNewGJSRGBe9jRt7NqTdL%2FM6JT4fDv%2B9mAkXtNp7tEAcd7TryHWqsIVKDCVv%2FfSBjqZAQChvj31aNY1BNcCepknHDy6LfqrM%2BWjLbgkMEUdYf%2FNe0eZshVSt0q1ephnEHjVVO4BXaPjjBwKdUnRjctDoKvGsWxu5Ylk6HWuOyt%2BD%2BS4anV2fV5u3eiEs5uddhOoIXCRC10WOL794%2FRg5ADZYeK6h%2B6%2Fe39v6XP4eAnZ%2BwpK65DAUf9g2tKQHvy2HTOMDHFdMxVx40plBA%3D%3D&Expires=1784540520)
- **Manual Matching Workspace:** For unassigned bookings, admins open a dedicated assignment screen that shows booking context plus a ranked shortlist of eligible providers filtered by service category, location coverage, vetting status, availability, ratings, and performance metrics. [oyelabs](https://oyelabs.com/how-to-build-home-services-marketplace-app/)
- **Assignment & Reassignment:** Admins can assign a provider, reassign to another provider, or cancel jobs, with each change updating booking status, generating OTPs if required, triggering notifications (provider + customer), and writing immutable entries into `booking_status_logs` and the audit log. [supabase](https://supabase.com/blog/postgres-audit)

***

### 3.3 Partner (Provider) Management & Vetting

- **Vetting Hub:** Centralized view of provider applications showing identity documents, certifications, service areas, and categories, with actions to approve, reject, request more information, or block/unblock providers. [scnd](https://www.scnd.com/platform-marketplace/service-marketplace-platform)
- **Status Control:** Admins can move providers through `pending`, `approved`, `rejected`, and `blocked` states; status changes are reflected in assignment eligibility and logged for audit. [xgenious](https://xgenious.com/home-services-marketplace-development-features-implementation/)
- **Performance Monitoring:** Per‑provider dashboard with KPIs such as completed jobs, cancellation rate, average rating, disputes count, revenue generated, and repeat customer rate to inform manual assignment decisions and future ML models. [miracuves](https://miracuves.com/blog/urbanclap-feature-list/)

***

### 3.4 Customer Management

- **Customer Directory:** Filterable list of customers with key metrics (total bookings, lifetime value, cancellation rate, dispute history, verification status). [linkedin](https://www.linkedin.com/pulse/how-launch-on-demand-home-services-marketplace-yo-gigs)
- **Customer Profile View:** Detailed view of a customer’s booking history, payments, reviews given, and any risk flags, with tools to issue credits/coupons, restrict abusive users (e.g. block or require prepayment), and view communication history for disputes. [rigbyjs](https://www.rigbyjs.com/blog/services-marketplace-features)

***

### 3.5 Financial Management & Payouts

- **Transaction Logs:** Detailed booking-level financial view including Stripe payment intent status, service price, platform commission, provider payout amount, refunds, and net revenue. [miracuves](https://miracuves.com/blog/urbanclap-feature-list/)
- **Commission & Revenue Tracking:** Configuration screens to set per‑category commission rates and track platform revenue over time by category, region, and provider segment. [unitedwebsoft](https://unitedwebsoft.in/urban-company-urbanclap-clone-script)
- **Refund & Payout Management:** Workflows for approving and processing customer refunds and provider payouts, including the ability to hold or release payouts manually, with all decisions logged in the audit table and visible in finance dashboards. [supabase](https://supabase.com/blog/postgres-audit)

***

### 3.6 Quality, Reviews & Disputes

- **Quality Monitoring:** Views highlighting low‑rated jobs, frequent cancellations, and high‑dispute providers/customers, enabling early intervention. [rigbyjs](https://www.rigbyjs.com/blog/services-marketplace-features)
- **Dispute Handling:** Structured dispute cases linked to bookings with access to chat logs, photos, notes, and resolution options (full refund, partial refund, free re‑visit, rating adjustments), plus a record of actions and outcomes for future reference. [xgenious](https://xgenious.com/home-services-marketplace-development-features-implementation/)

***

### 3.7 Operations: Scheduling & Exceptions

- **Scheduling Control:** Admins can reschedule bookings (change date/time), extend or shorten slots, and update job windows in coordination with customers and providers. [oyelabs](https://oyelabs.com/how-to-build-home-services-marketplace-app/)
- **Exception Management:** Tools to handle provider absence, customer no‑shows, delays, and last‑minute changes, including automated or manual triggers for reassignment and status updates; all changes are logged and notify affected parties. [oyelabs](https://oyelabs.com/how-to-build-home-services-marketplace-app/)

***

### 3.8 Service Catalog & Platform Configuration

- **Service Management:** Add, edit, and deactivate service categories and sub‑services, define required inputs (e.g. photos, quantity, appliance type), and configure pricing (fixed, time‑based, surcharges). [unitedwebsoft](https://unitedwebsoft.in/urban-company-urbanclap-clone-script)
- **Geo & Eligibility Rules:** Configure availability of services by postcode/region and specify eligibility requirements such as license types or advanced vetting for specific services. [scnd](https://www.scnd.com/platform-marketplace/service-marketplace-platform)

***

### 3.9 Analytics & Reporting

- **Operational Dashboards:** Charts and reports for bookings per day/week, conversion funnel (search → booking → completion), cancellation reasons, category performance, geographic distribution, and provider performance distribution. [virtocommerce](https://virtocommerce.com/blog/service-marketplace)
- **Exports & BI:** Ability to export bookings, financials, and quality metrics as CSV for use in external BI tools, and scheduled reports for operations, finance, and marketing stakeholders. [rigbyjs](https://www.rigbyjs.com/blog/services-marketplace-features)

***

### 3.10 Auditability & Security

- **Immutable Audit Log:** Dedicated audit table capturing all critical admin actions (assignments, reassignments, approvals, payouts, catalog changes, dispute resolutions) with actor, role, entity, timestamp, and contextual metadata, implemented as append‑only as per Supabase/Postgres audit best practices. [supabase](https://supabase.com/docs/guides/database/extensions/pgaudit)
- **Access Control & Compliance:** Strong authentication (Supabase Auth), optional 2FA for admins, RLS‑based enforcement using admin role functions, and data protection aligned with UK/EU norms for handling customer and provider data. [akoskm](https://akoskm.com/admin-user-permissions-in-supabase-with-rls/)

***

### 3.11 Future Recommendation / ML Engine (Beyond V1)

- Design the Manual Assignment Engine as a pluggable “assignment strategy” layer: V1 uses `strategy = manual_admin`, while future versions will add `strategy = ml_recommendation` to pre‑rank providers based on historical performance, location, and constraints. [oyelabs](https://oyelabs.com/how-to-build-home-services-marketplace-app/)
- Keep all surrounding modules (bookings, provider management, customer management, finance, quality, analytics, audit) agnostic to the assignment strategy so upgrading to ML requires minimal UI changes and mostly backend logic updates. [rigbyjs](https://www.rigbyjs.com/blog/services-marketplace-features)

***

## 4. Non-Functional Requirements

- **Data Density & Usability:** The admin UI must be optimized for desktop use, with dense tables, powerful filters, keyboard shortcuts, and responsive performance for operations teams working throughout the day. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/47802782/27141004-aac4-49e5-a922-8e0e031d9308/AdminPanelPRD.md?AWSAccessKeyId=ASIA2F3EMEYEQQ42BHKW&Signature=i3mc7A8KvHXSSSsedmirDfGRwPQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIF46fTyQHObWSGKon%2B6pN8IxbJfi9r8Sb3OFrGo0t7%2BNAiApk3UhPKwYVMDaKAVGESLEd3M5%2BYp%2BVHzVkC8Sk%2BENayr8BAii%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMcylfWV%2FU9jElbEyOKtAEZuH0%2B8Eio%2BdM4CqfvWsZsU3rXSxgxd6uWbTl6cqIrXrEUMf6lKKybY%2FO0ZiQaxewpUOAJHSuq3ABpix3wd%2BkR7QDSG9K%2Bhfzo5OM8JBqlPzdKl3OXsJ4eX6W421muAr4s%2BuLixbwFtDAgd9TlTXL6FKMDvSHVyhwz0lB1P3RzcnLSRCCqg7DFjZhkKR5NKYkFC1fFjlsMP9ZbhQdr4Thmh5GBj%2FKHGZoOVWr4HcT424%2BJNjz2JbHQLlTgg%2F84fm96NgyRrSqlEUnB2AZe62V7WF1%2BZYGZOq1D6eKaxfgb6apPnoday87%2B8nBk%2FqukcJ7%2BWuffAqIqNEncN9oY2Ikm2CvlyNJDJdKG%2FXdXcPEbfXLcF3N0u2sMGmc%2F42usH1DHdidOPyenjwMpOSe%2BzRvvtnXIh0A9IO3T1R8fTgPzQFtbbu%2B6s%2BWO0qEtQgEp7lu6qQt8M3K4FVnjxjpg6yi%2BXuBqk7VHwTcU5XJPnuqILHeDPhDfznzTup3zw%2FyMW6DZP8L0Mdl%2Bna7cSheQWYPURT%2BJx3qCiPYGyIv%2FFgSYHS%2BFKpN%2BeNNapLu200JcegT5TerPRZcCc%2B73mbH8qci05v71%2BYbGkTjrfEuE4X6TT4HhaGTwDTa3XIr11m85Qcx0XKgQW2gOmoXXDNTjYFEl5fLwKuZba7%2B0eHLSNoDKe8EM6UBWzYIDcLSQ5ji4EH%2BRTghVP0WELEzXNleqO6uT11%2FL%2BJaicNewGJSRGBe9jRt7NqTdL%2FM6JT4fDv%2B9mAkXtNp7tEAcd7TryHWqsIVKDCVv%2FfSBjqZAQChvj31aNY1BNcCepknHDy6LfqrM%2BWjLbgkMEUdYf%2FNe0eZshVSt0q1ephnEHjVVO4BXaPjjBwKdUnRjctDoKvGsWxu5Ylk6HWuOyt%2BD%2BS4anV2fV5u3eiEs5uddhOoIXCRC10WOL794%2FRg5ADZYeK6h%2B6%2Fe39v6XP4eAnZ%2BwpK65DAUf9g2tKQHvy2HTOMDHFdMxVx40plBA%3D%3D&Expires=1784540520)
- **Scalability & Reliability:** Support increasing volumes of bookings, providers, and audit events without degrading performance, leveraging Supabase/Postgres indexing and partitioning where necessary. [supabase](https://supabase.com/docs/guides/database/extensions/pgaudit)
- **Auditability & Observability:** Comprehensive logging of all critical admin actions plus application-level monitoring (errors, response times) to support investigations and continuous improvement. [supabase](https://supabase.com/docs/guides/database/extensions/pgaudit)
- **Security & Privacy:** RBAC enforcement via RLS, secure storage of secrets, and adherence to privacy norms for personal data, including controlled access to sensitive fields and audit trails. [supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)

***

## 5. Success Metrics

- **Assignment Time:** Average time from booking creation to provider assignment, segmented by category and region. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/47802782/27141004-aac4-49e5-a922-8e0e031d9308/AdminPanelPRD.md?AWSAccessKeyId=ASIA2F3EMEYEQQ42BHKW&Signature=i3mc7A8KvHXSSSsedmirDfGRwPQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIF46fTyQHObWSGKon%2B6pN8IxbJfi9r8Sb3OFrGo0t7%2BNAiApk3UhPKwYVMDaKAVGESLEd3M5%2BYp%2BVHzVkC8Sk%2BENayr8BAii%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMcylfWV%2FU9jElbEyOKtAEZuH0%2B8Eio%2BdM4CqfvWsZsU3rXSxgxd6uWbTl6cqIrXrEUMf6lKKybY%2FO0ZiQaxewpUOAJHSuq3ABpix3wd%2BkR7QDSG9K%2Bhfzo5OM8JBqlPzdKl3OXsJ4eX6W421muAr4s%2BuLixbwFtDAgd9TlTXL6FKMDvSHVyhwz0lB1P3RzcnLSRCCqg7DFjZhkKR5NKYkFC1fFjlsMP9ZbhQdr4Thmh5GBj%2FKHGZoOVWr4HcT424%2BJNjz2JbHQLlTgg%2F84fm96NgyRrSqlEUnB2AZe62V7WF1%2BZYGZOq1D6eKaxfgb6apPnoday87%2B8nBk%2FqukcJ7%2BWuffAqIqNEncN9oY2Ikm2CvlyNJDJdKG%2FXdXcPEbfXLcF3N0u2sMGmc%2F42usH1DHdidOPyenjwMpOSe%2BzRvvtnXIh0A9IO3T1R8fTgPzQFtbbu%2B6s%2BWO0qEtQgEp7lu6qQt8M3K4FVnjxjpg6yi%2BXuBqk7VHwTcU5XJPnuqILHeDPhDfznzTup3zw%2FyMW6DZP8L0Mdl%2Bna7cSheQWYPURT%2BJx3qCiPYGyIv%2FFgSYHS%2BFKpN%2BeNNapLu200JcegT5TerPRZcCc%2B73mbH8qci05v71%2BYbGkTjrfEuE4X6TT4HhaGTwDTa3XIr11m85Qcx0XKgQW2gOmoXXDNTjYFEl5fLwKuZba7%2B0eHLSNoDKe8EM6UBWzYIDcLSQ5ji4EH%2BRTghVP0WELEzXNleqO6uT11%2FL%2BJaicNewGJSRGBe9jRt7NqTdL%2FM6JT4fDv%2B9mAkXtNp7tEAcd7TryHWqsIVKDCVv%2FfSBjqZAQChvj31aNY1BNcCepknHDy6LfqrM%2BWjLbgkMEUdYf%2FNe0eZshVSt0q1ephnEHjVVO4BXaPjjBwKdUnRjctDoKvGsWxu5Ylk6HWuOyt%2BD%2BS4anV2fV5u3eiEs5uddhOoIXCRC10WOL794%2FRg5ADZYeK6h%2B6%2Fe39v6XP4eAnZ%2BwpK65DAUf9g2tKQHvy2HTOMDHFdMxVx40plBA%3D%3D&Expires=1784540520)
- **Assignment Quality:** Rates of successful job completion, repeat bookings, and post‑job ratings for manually assigned jobs, compared to target benchmarks. [xgenious](https://xgenious.com/home-services-marketplace-development-features-implementation/)
- **Vetting Throughput:** Number of providers vetted and activated per week, plus time from application submission to approval or rejection. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/47802782/27141004-aac4-49e5-a922-8e0e031d9308/AdminPanelPRD.md?AWSAccessKeyId=ASIA2F3EMEYEQQ42BHKW&Signature=i3mc7A8KvHXSSSsedmirDfGRwPQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIF46fTyQHObWSGKon%2B6pN8IxbJfi9r8Sb3OFrGo0t7%2BNAiApk3UhPKwYVMDaKAVGESLEd3M5%2BYp%2BVHzVkC8Sk%2BENayr8BAii%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMcylfWV%2FU9jElbEyOKtAEZuH0%2B8Eio%2BdM4CqfvWsZsU3rXSxgxd6uWbTl6cqIrXrEUMf6lKKybY%2FO0ZiQaxewpUOAJHSuq3ABpix3wd%2BkR7QDSG9K%2Bhfzo5OM8JBqlPzdKl3OXsJ4eX6W421muAr4s%2BuLixbwFtDAgd9TlTXL6FKMDvSHVyhwz0lB1P3RzcnLSRCCqg7DFjZhkKR5NKYkFC1fFjlsMP9ZbhQdr4Thmh5GBj%2FKHGZoOVWr4HcT424%2BJNjz2JbHQLlTgg%2F84fm96NgyRrSqlEUnB2AZe62V7WF1%2BZYGZOq1D6eKaxfgb6apPnoday87%2B8nBk%2FqukcJ7%2BWuffAqIqNEncN9oY2Ikm2CvlyNJDJdKG%2FXdXcPEbfXLcF3N0u2sMGmc%2F42usH1DHdidOPyenjwMpOSe%2BzRvvtnXIh0A9IO3T1R8fTgPzQFtbbu%2B6s%2BWO0qEtQgEp7lu6qQt8M3K4FVnjxjpg6yi%2BXuBqk7VHwTcU5XJPnuqILHeDPhDfznzTup3zw%2FyMW6DZP8L0Mdl%2Bna7cSheQWYPURT%2BJx3qCiPYGyIv%2FFgSYHS%2BFKpN%2BeNNapLu200JcegT5TerPRZcCc%2B73mbH8qci05v71%2BYbGkTjrfEuE4X6TT4HhaGTwDTa3XIr11m85Qcx0XKgQW2gOmoXXDNTjYFEl5fLwKuZba7%2B0eHLSNoDKe8EM6UBWzYIDcLSQ5ji4EH%2BRTghVP0WELEzXNleqO6uT11%2FL%2BJaicNewGJSRGBe9jRt7NqTdL%2FM6JT4fDv%2B9mAkXtNp7tEAcd7TryHWqsIVKDCVv%2FfSBjqZAQChvj31aNY1BNcCepknHDy6LfqrM%2BWjLbgkMEUdYf%2FNe0eZshVSt0q1ephnEHjVVO4BXaPjjBwKdUnRjctDoKvGsWxu5Ylk6HWuOyt%2BD%2BS4anV2fV5u3eiEs5uddhOoIXCRC10WOL794%2FRg5ADZYeK6h%2B6%2Fe39v6XP4eAnZ%2BwpK65DAUf9g2tKQHvy2HTOMDHFdMxVx40plBA%3D%3D&Expires=1784540520)
- **Platform Health:** Cancellation and refund rates, dispute incidence, and resolution times, monitored over time to ensure operational stability. [xgenious](https://xgenious.com/home-services-marketplace-development-features-implementation/)
- **Operational Efficiency:** Admin workload measures (bookings handled per ops admin per day, manual interventions per booking) and overall productivity of the operations team. [rigbyjs](https://www.rigbyjs.com/blog/services-marketplace-features)

***
