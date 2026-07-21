# Admin Dashboard Sitemap and Features for Urban Company–Style Home Services Platform

## Overview

This report synthesizes common admin panel structures and features used by Urban Company–style on-demand home services marketplaces, based on multiple clone scripts and home-service platform guides. It proposes a comprehensive sitemap (menus and submenus) plus detailed responsibilities and typical functionality of each area in the admin dashboard.

## High-Level Admin Sitemap

A robust home-services marketplace admin panel usually organizes functionality into the following top-level menus:

1. Dashboard
2. Bookings / Orders
3. Users (Customers, Providers, Staff)
4. Services & Categories
5. Pricing & Commission
6. Scheduling & Slots
7. Payments & Transactions
8. Promotions & Marketing
9. Ratings & Reviews
10. Support & Disputes
11. Analytics & Reports
12. Configuration (Business & App Settings)
13. System & Security (Roles, Permissions, Logs)

Each top-level menu contains submenus and feature sets described below.

***

## Dashboard

### Submenus

- Overview / KPI summary
- Live activity feed
- Operational alerts

### Core Features

- Display key metrics: total bookings, revenue, active service providers, active customers, cancellations, refunds, and payout amounts, often with time filters (today, week, month).
- Show live bookings activity (new requests, ongoing jobs, completed jobs) with quick access links into the booking details.
- Provide city/zone-level breakdowns so admins can see performance by geography in multi-city deployments.
- Surface operational alerts (e.g., high cancellation rate on a category, payment gateway issues, provider verification backlog) as cards or notifications on the dashboard.

***

## Bookings / Orders

### Submenus

- All bookings
- Pending / upcoming bookings
- Ongoing jobs (in progress)
- Completed bookings
- Cancelled bookings
- Booking feed / live tracking

### Core Features

- List all service bookings with filters by status, date range, customer, provider, category, city/zone, and payment status.
- View booking details: service type, scheduled time, address, assigned provider, price components, commission split, discounts, taxes, and payment method.
- Edit or reassign bookings (e.g., reassign provider, change time-slot, adjust pricing when required) under defined business rules.
- Manage cancellations and rescheduling; enforce policies like cutoff times, cancellation fees, and automatic communication to both sides.
- Trigger manual actions such as forcing job completion, initiating refund, initiating compensation, or pushing notifications when a booking is stuck.
- Support live tracking view (map-based or list-based) showing where providers are and which jobs they are currently working on.

***

## Users (Customers, Providers, Staff)

### Submenus

- Customers
  - Customer list
  - Customer details
  - Customer segments
- Service Providers / Partners
  - Provider list
  - Verification & KYC
  - Provider details & portfolio
  - Onboarding pipeline
  - Provider performance
- Staff / Admin Users
  - Admin accounts
  - Roles & permissions

### Core Features

#### Customers

- List all customers with search and filters by phone/email, city, registration date, booking activity, and lifetime value.
- View customer profile: personal data, KYC flags (if applicable), booking history, complaints, refunds, and wallet/loyalty balance.
- Manage customer status (active, banned, test account) and apply manual adjustments like crediting wallet balance or granting loyalty points.

#### Service Providers / Partners

- Approve and manage partners: verify documents, background checks, and training completion before making them active on the platform.
- Enable or disable a partner and control whether they can receive jobs in specific cities/zones or categories.
- Maintain provider profiles and portfolios including bio, skills, service offerings, pricing, photos, and service radius.
- Track provider performance: ratings, completion rates, cancellations, punctuality, and revenue earned over custom periods.
- Manage provider payout details and financial accounts (bank, UPI, wallet) for disbursements.

#### Staff / Admin Users

- Create and manage internal admin and operations users, assigning roles such as super admin, city manager, category manager, support agent, and finance analyst.
- Attach fine-grained permissions (view/edit rights) per module (bookings, providers, payments, promotions) to each role.

***

## Services & Categories

### Submenus

- Service categories
- Subcategories
- Service SKUs / packages
- Add-ons and variants
- Attributes & questions (service configuration)

### Core Features

- Create and manage multi-level categories (e.g., Home Cleaning → Deep Clean vs Basic; Beauty → Salon at home, spa).
- Configure subcategories and specific service packages (SKUs) with name, description, included tasks, duration, default pricing, and allowed add-ons.
- Define service attributes and questions used in the customer booking flow (e.g., number of rooms, type of issue, equipment required).
- Set category visibility per city/zone, allowing some service types only in certain markets.
- Activate/deactivate categories or individual SKUs temporarily for operational reasons (e.g., provider shortage, regulatory restrictions).

***

## Pricing & Commission

### Submenus

- Rate cards
- City/zone-wise variable pricing
- Commission rules
- Taxes & fees
- Dynamic pricing rules

### Core Features

- Maintain base pricing for each service SKU, often per city/zone to reflect local market conditions.
- Configure provider commission percentages, fixed fees, platform markups, and minimum payout thresholds per category or provider segment.
- Define taxes, convenience fees, and surcharges (e.g., peak-time fee, festival surcharge) and link them to dynamic pricing rules.
- Support time-based or demand-based pricing adjustments (e.g., weekends, high-demand slots) through rules engines.

***

## Scheduling & Slots

### Submenus

- Time-slot definitions
- Holidays & blackout dates
- Provider availability overrides

### Core Features

- Configure global time-slot templates (e.g., 9–11, 11–1, 1–3) per city and per category.
- Mark holidays, maintenance days, or blackout periods when bookings should be blocked in specific zones or categories.
- Override provider availability at the admin level (e.g., temporarily block assignments after repeated issues, or free up capacity when they add staff).

***

## Payments & Transactions

### Submenus

- Transaction list
- Customer payments
- Provider payouts
- Refunds & adjustments
- Wallet & loyalty

### Core Features

- Access a detailed transaction list including transaction IDs, amounts, payer/payee, booking reference, and current status (success/failed/refunded).
- Manage customer payments across methods (card, UPI, net banking, wallet) and reconcile gateway settlements with bookings.
- Handle refunds and partial refunds with reasons, approvals, and audit trail.
- Manage provider payouts via scheduled or manual batch runs, tracking payout status and linked bookings.
- Configure and monitor platform wallet and loyalty points, including bonus rules and redemption activity.

***

## Promotions & Marketing

### Submenus

- Coupons and promo codes
- Campaigns
- Banners and featured services
- Referral programs
- Loyalty programs

### Core Features

- Create coupon codes with parameters such as discount type, amount, eligibility (user segments, categories), usage limits, and validity dates.
- Manage promotional campaigns that group multiple offers, banners, and push notifications targeting specific zones or user segments.
- Design and position banners on web/app home screens to highlight categories, seasonal offers, or partner brands.
- Configure referral programs (invite friends, earn credits) and track referral performance per campaign.
- Operate loyalty programs with tiered benefits, bonus rules, and reporting on engagement and breakage.

***

## Ratings & Reviews

### Submenus

- Customer reviews on providers
- Provider feedback on customers
- Quality scoring & flags

### Core Features

- View and moderate customer reviews on service providers (rating, text feedback, photos), with options to hide inappropriate content while retaining audit logs.
- Aggregate ratings into provider quality scores and surface low performers for retraining or suspension.
- Review provider feedback on customers to detect abusive behavior and decide on warnings or bans.

***

## Support & Disputes

### Submenus

- Support tickets
- Booking disputes
- Compensation & rework

### Core Features

- Provide a helpdesk-style ticketing view where customer and provider issues are tracked, prioritized, and assigned to support agents.
- Manage booking-related disputes (e.g., service not delivered, poor quality, overcharging) with workflows for investigation and resolution.
- Record compensation actions like free rework, partial refund, or goodwill credits to customer wallet, and attach them to dispute records.

***

## Analytics & Reports

### Submenus

- Booking analytics
- Revenue analytics
- Provider performance reports
- Category and campaign performance

### Core Features

- Provide business analytics dashboards: bookings over time, conversion funnels, churn, repeat usage, and cohort analyses.
- Offer revenue analytics including gross merchandise value (GMV), net revenue, commissions, discounts, and payouts, often broken down by city, category, and channel.
- Generate provider performance reports combining operational metrics (acceptance rate, on-time arrival, completion rate) with rating data.
- Track category performance (e.g., top categories by revenue, cancellations, satisfaction) and campaign effectiveness (redemptions, uplift).

***

## Configuration (Business & App Settings)

### Submenus

- Business zones & cities
- Integrations (payments, SMS, email, storage, social login)
- Notification templates
- Content pages (T&C, privacy policy, FAQs)
- App appearance (themes, branding)

### Core Features

- Set up multiple business zones and cities, assign providers and categories to specific zones, and control availability per area.
- Configure third-party integrations such as payment gateways, SMS providers, email providers, social login, reCAPTCHA, and storage services.
- Manage notification templates (SMS, email, push) for events like booking confirmations, provider assignment, rescheduling, cancellations, and promotions.
- Edit content pages including terms and conditions, privacy policy, FAQs, and help center articles, ensuring compliance and consistency.
- Adjust branding settings such as logo, color theme, favicon, and sometimes UI theme per admin group, aligning with corporate brand guidelines.

***

## System & Security (Roles, Permissions, Logs)

### Submenus

- Roles & permissions
- Audit logs
- Security & KYC rules

### Core Features

- Define and maintain roles (e.g., super admin, finance admin, support lead, city manager) and assign granular permissions per module.
- Keep audit logs of all critical admin actions (price changes, payout approvals, dispute resolutions, provider verification decisions) for accountability.
- Configure global security settings: password policies, 2FA requirements, KYC rules for providers and high-value customers.

***

## Summary

The sitemap and feature set outlined here consolidates common practices across Urban Company–style home-services platforms and clone scripts. It is designed to give product and engineering teams a concrete blueprint for implementing a full admin dashboard that supports operations, finance, quality, and growth for an at-scale services marketplace.

---

## References

1. [UrbanClap Feature List for Startups Building Service Apps](https://miracuves.com/blog/urbanclap-feature-list/) - UrbanClap's admin dashboard lets platform owners: Monitor bookings & revenue Manage user disputes Se...

2. [UrbanClap Clone Script | Source Code](https://www.appicial.com/urbanclap-clone-script.html) - Admin Dashboard A fully functional, Mobile supported web based admin panel. Multilevel menu structur...

3. [Home Services App Development & Business Startup Guide](https://msmcoretech.com/blogs/on-demand-home-services-app) - Features for the Admin Panel A central dashboard to monitor live bookings, revenue, and platform act...

4. [Build an Urban Company Clone App – Step-by-Step Guide](https://www.imgglobalinfotech.com/blog/urban-company-clone-app-development-guide) - Admin Dashboard Also, have a backend management panel for efficient reporting. Users, services, paym...

5. [A Complete Guide to Home Services App Features List](https://oyelabs.com/home-services-app-features-list/) - An interactive dashboard must be in the admin row. The dashboard serves as a control center for the ...

6. [On-Demand Home Services App Development](https://www.biztechcs.com/blog/on-demand-home-service-app/) - An interactive dashboard is a must for the admin panel. Your dashboard will act as a control center ...

7. [Urban Company Clone App Development | Home Services ...](https://techweblabs.com/urban-clone-app) - Essential features include: service booking, professional matching, real-time tracking, multiple pay...

8. [Top Home Service App Features Must Include in 2026](https://www.imgglobalinfotech.com/blog/home-service-app-features) - Admin Panel Features · Extensive Dashboard · Transaction Management · Reviews Management · Promotion...

9. [Cost to Build a Home Service App Like Urban Company](https://quick-works.com/blog/cost-to-develop-home-service-app-like-urban-company/) - Admin Panel is the central hub where platform owners monitor users, service categories, bookings, co...

10. [On Demand Home Services App Development Solution](https://demandium.app/on-demand-home-services-app-developement/) - Home Service Solution Admin Panel. Explore Admin Demo. User App. Easy Signup ... Live Chat. The buil...

11. [How to Create a Home Service App Like Urban Company](https://www.apptunix.com/blog/create-an-app-like-urban-company/) - Admins can monitor both customers and professionals, verify new signups, and handle service categori...

12. [How to develop On-demand Home service app](https://acquaintsoft.com/blog/on-demand-home-services-app-development-guide) - In this article, we'll go over the specifics of the on-demand home services app development features...

13. [MWTheme admin theme. seller and ...](https://marketplace.cs-cart.com/mwtheme-admin-paneli-prodavca-i-admina-marketpleysa-dlya-cs-cart-multi-vendor.html) - The module changes the design of the admin panel, allowing you to choose a color palette, replace fo...

14. [Urban Company (UrbanClap) Clone Script, Home Service ...](https://unitedwebsoft.in/urban-company-urbanclap-clone-script) - Manage everything from the powerful admin dashboard. Here you will access unlimited multi level cate...

15. [Cost to Develop a Home Service App Like Urban Company](https://appinventiv.com/blog/cost-to-build-a-home-service-app-like-urban-company/) - Offers premium features such as AI-driven personalized service recommendations, loyalty programs, ad...

16. [On-Demand Service App Ready in 2 Days](https://www.cscodetech.com/on-demand-service-app) - App Modules & Panel Features. We build an attractive service marketplace UI/UX that helps you launch...

17. [UrbanClap/Urban Company Clone App for At-Home ...](https://devathon.com/urbanclap-urban-company-clone-app-for-at-home-beauty-salon-grooming-services/) - With our UrbanClap / Urban Company Clone App you can use your own brand name & logo, colour theme an...
