# Visual Wireframes & UI Layouts: Provider Application ("Urban Assist Professional")

This document defines the interface designs, visual components, layout grids, and interactive states for the **Provider Web/Mobile Application**, optimized for the Urban Assist UK flat-rate pricing and onboarding standards.

---

## 1. Screen 1: Registration Intake & SMS OTP Authentication

This screen handles new user registration and authentication using a clean, single-screen OTP workflow.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Partner App]                                         │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Welcome to Urban Assist Professional                      │  ◄── Primary Title
│  Earn on your terms. Flexible hours. Standardized rates.   │  ◄── Subtitle
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Mobile Number                                        │  │  ◄── Mobile Field
│  │ [ +44 ] [ 7911 123456                        ]       │  │      (E.164 pre-fill)
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SMS Verification Code (Sent to +44 7911 123456)      │  │  ◄── OTP Input Box
│  │ [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ]                  │  │      (Triggered after number entry)
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [ Send Code / Verify Code ]                               │  ◄── Solid Active Button
│                                                            │
│  By signing up, you agree to our B2B Contractor Terms.     │  ◄── Legal Disclaimer
│                                                            │
├────────────────────────────────────────────────────────────┤
│  [ App Store ] [ Google Play ]                             │  ◄── Footer Store Links
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Aesthetic Theme:** Dark Mode default (Deep gray `#121212` background, white slate cards `#1E1E1E` for high readability in outdoor lighting).
*   **Primary Action Button:** Vibrant neon orange solid button. Disables and shows a spinner during API loading states.
*   **Inputs:** Monospaced spacing for the 6-digit OTP fields with automatic focus shift.

---

## 2. Screen 2: Document Upload & KYC Verification Status

Locked screen displayed to providers during document collection or when onboarding status is pending review.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Vetting Queue]                           [Log Out]   │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Step 1 of 2: Get Verified                                 │  ◄── Active Stage
│  Upload mandatory documents to activate your account.      │
│                                                            │
│  ┌─ Documents Checklist ─────────────────────────────────┐ │
│  │                                                       │ │
│  │ 1. Proof of Identity                                  │ │
│  │    Passport or UK Driving Licence      [ Uploaded ✔ ]  │  ◄── Success State
│  │                                                       │  │
│  │ 2. Public Liability Insurance                         │  │
│  │    Minimum £1M coverage required        [ Missing ✖ ] │  │  ◄── Action Required
│  │                                                       │  │
│  │ 3. Trade Certifications (Optional)                    │  │
│  │    e.g. Gas Safe / ECS cards            [ 0 Uploaded ]   │  ◄── Optional State
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ File Uploader ───────────────────────────────────────┐  │
│  │ Select Type: [ Public Liability Insurance   ] [v]   b │  │  ◄── Select Dropdown
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │   [Drag & Drop your Image or PDF here]          │  │  │  ◄── File Drag Drop Box
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │ [ Upload Document ]                                   │  │  ◄── Button
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  [ Continue to Services Setup ]  (Disabled until verified) │  ◄── Inactive Button
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Status Badges:** Text indicators wrapped in pill badges. Green for `Uploaded / Verified`, Amber for `Pending Review`, Red for `Expired / Rejected`.
*   **Disabled States:** The "Continue" button is grayed out and non-clickable until both `id` and `insurance` document checks are resolved in the database.

---

## 3. Screen 3: Service Catalog & Global Flat-Rate Activation

Providers choose the categories they service. They accept standard platform-set flat rates with no manual price input.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Service Setup]                           Step 2 of 2 │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Select Your Services                                      │  ◄── Header
│  Toggle the trades you cover. You will receive work based  │
│  on the platform's standardized UK rates.                  │
│                                                            │
│  ┌─ Services Catalog Checklist ──────────────────────────┐  │
│  │                                                       │  │
│  │ [x] Boiler Repair & Maintenance                       │  │  ◄── Active Toggle
│  │     Flat Price: £85.00  ·  Duration: 60 mins          │  │
│  │                                                       │  │
│  │ [x] Home Cleaning (Standard)                          │  │  ◄── Active Toggle
│  │     Flat Price: £30.00  ·  Duration: 120 mins         │  │
│  │                                                       │  │
│  │ [ ] Electrician Emergency Call-out                    │  │  ◄── Inactive Toggle
│  │     Flat Price: £120.00 ·  Duration: 90 mins          │  │
│  │                                                       │  │
│  │ [ ] Gas Appliance Safety Check                        │  │  ◄── Inactive Toggle
│  │     Flat Price: £65.00  ·  Duration: 45 mins          │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  [ Save & Open Dashboard ]                                 │  ◄── Solid Primary Button
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Pricing Text:** Rendered in bold, high-contrast monospace font (`font-mono-utility`) so pricing is prominent.
*   **Toggle Mechanism:** Clean toggle check-boxes or iOS-style green switches. Saving immediately syncs relationships back to the database.

---

## 4. Screen 4: Provider Dashboard & Active Job Offers

The primary view showing active status, scheduling, earnings, and dynamic offer cards with countdown timelines.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Dashboard]                      [Profile]  [ ONLINE ]│  ◄── Header with Active Green
├────────────────────────────────────────────────────────────┤      Online Status Switcher
│                                                            │
│  Good Afternoon, Rajesh                                    │  ◄── User Salutation
│                                                            │
│  ┌─ Today's Performance ─────────────────────────────────┐  │
│  │  Jobs Complete: 3     │  Earnings Today: £195.00      │  │  ◄── Stats Column Grid
│  │  Rating: 4.9 ★        │  Accept Rate: 98%             │  │      (2 columns)
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌── NEW JOB OFFER ────────────────────────── [ 75s Left ] ──┐  ◄── Offer Card with Amber
│  │                                                         │  │      Countdown Border
│  │  Boiler Repair & Maintenance                            │  │
│  │  Scheduled: Today, 2:00 PM  (ETA 30m)                   │  │
│  │  Location: London, EC1A (1.8 miles away)                │  │
│  │                                                         │  │
│  │  Payout: £85.00                                         │  │  ◄── Flat Rate Payout
│  │                                                         │  │
│  │  [ Decline ]                    [ Accept Job ]          │  │  ◄── Secondary Outline /
│  └─────────────────────────────────────────────────────────┘  │      Vibrant Solid Buttons
│                                                            │
│  ┌─ Today's Schedule ────────────────────────────────────┐  │
│  │                                                       │  │
│  │  10:00 AM ── Home Cleaning (Standard)  [ Completed ]   │  │  ◄── Event Time Timeline
│  │             Address: Flat 3, 12 Park Road · £30.00    │  │
│  │                                                       │  │
│  │  04:00 PM ── Boiler Inspection         [ Assigned ]    │  │  ◄── Event Time Timeline
│  │             Address: 8 Kingsway, EC2M · £65.00        │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Status Switcher:** Neon Green button label for `ONLINE` state (with indicator pulse), and muted gray for `OFFLINE` state.
*   **Job Offer Countdown:** The offer header displays a remaining seconds indicator (starts at 90s). The countdown card incorporates a decreasing amber progress bar mapping the remaining timeline.
*   **Navigation:** Mobile bottom-bar navigation: `Dashboard` (active), `Earnings`, `Schedule`, `Account`.

---

## 5. Screen 5: Active Job Execution & Verification OTP

Step-by-step workflow tracking progress on a live job, requiring an OTP check before starting to secure billing.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Job Details]                             [Go Back]   │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Boiler Repair & Maintenance                   [ Assigned ]│  ◄── Category & Current Status
│  Booking Reference: #UA-839D28                             │
│                                                            │
│  ┌─ Job Actions ─────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  [ 1. On The Way ] ──► [ 2. Arrived ] ──► [ 3. Done ]  │  │  ◄── Stage Progress Buttons
│  │                                                       │  │
│  │  To start the job, enter the 4-digit code provided    │  │
│  │  by the customer:                                     │  │
│  │                                                       │  │
│  │  OTP Code: [ _ ] [ _ ] [ _ ] [ _ ]                    │  │  ◄── Numeric Input Fields
│  │                                                       │  │
│  │  [ Start Service ]  (Disabled until OTP verified)     │  └───────────┐
│  └───────────────────────────────────────────────────────┘              │
│                                                                         │
│  ┌─ Client Details ──────────────────────────────────────┐              │
│  │  Name: Sarah Jenkins                                   │              │
│  │  Location: Flat 12, Tower A, London EC1Y              │              │
│  │  Notes: Parking available on-site. Lift is broken.    │              │
│  │                                                       │              │
│  │  [ Call via Proxy ]             [ Send Message ]      │  ◄── Communication Options
│  └───────────────────────────────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

---

## 6. Screen 6: Earnings & Weekly Ledger Details

Allows providers to track their current balance, weekly history, and payouts sent to their connected bank account.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Earnings]                                            │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Weekly Payout Balance                                     │  ◄── Section Title
│  £260.00                                                   │  ◄── High-Contrast Sum
│  Next automated payout: Friday, July 10                    │  ◄── Payout SLA
│                                                            │
│  ┌─ Stripe Payout Destination ───────────────────────────┐  │
│  │ Account Status: Active Onboarded                      │  │
│  │ Bank Account: Lloyds Bank (Ending in 3928)            │  │
│  │ [ View Stripe Express Dashboard ]                     │  │  ◄── Stripe Connect Link
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Weekly Ledger History ───────────────────────────────┐  │
│  │                                                       │  │
│  │  Mon, Jul 6  ──  Weekly Transfer Sent     [ +£340.00 ] │  │  ◄── Payout Transferred
│  │                                                       │  │
│  │  Tue, Jul 7  ──  #UA-839D28 Boiler Repair  [  +£85.00 ] │  │  ◄── Net Earning Log
│  │                  Flat Rate: £85.00                    │  │
│  │                                                       │  │
│  │  Tue, Jul 7  ──  #UA-743F21 Home Cleaning  [  +£30.00 ] │  │  ◄── Net Earning Log
│  │                  Flat Rate: £30.00                    │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Earnings Figures:** Large typography using green accents for positive transfers (`+£85.00`) and standard text for automated bank transfer summaries.
*   **Stripe Link Button:** Includes a brand icon for Stripe Connect, launching external onboarding portals in an in-app overlay.

---

## 7. Screen 7: Schedule Manager (Availability Configuration)

Allows providers to configure which days/hours they are available to receive automated booking dispatch matches.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Schedule Setup]                                      │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Working Hour Slots                                        │  ◄── Section Title
│  Configure when you can accept new job matching offers.    │
│                                                            │
│  ┌─ Weekly Availability ─────────────────────────────────┐  │
│  │                                                       │  │
│  │  [x] Monday     │  09:00 AM  ──  05:00 PM  [ Edit ]   │  │  ◄── Day Slot Toggle
│  │  [x] Tuesday    │  08:00 AM  ──  06:00 PM  [ Edit ]   │  │
│  │  [ ] Wednesday  │  Unavailable             [ Add  ]   │  │  ◄── Inactive Day Slot
│  │  [x] Thursday   │  09:00 AM  ──  05:00 PM  [ Edit ]   │  │
│  │  [x] Friday     │  09:00 AM  ──  05:00 PM  [ Edit ]   │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Add Planned Time Off ────────────────────────────────┐  │
│  │  Start Date: [ 12 / 07 / 2026 ]                       │  │  ◄── Date Fields
│  │  End Date:   [ 15 / 07 / 2026 ]                       │  │
│  │                                                       │  │
│  │  [ Save Leave Period ]                                │  │  ◄── Button
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Grid layout:** Horizontal split for each weekday, displaying switches to quickly toggle a day on or off, and text buttons to customize hour limits.

---

## 8. Screen 8: Job History / Archive

Historical log of all jobs completed, cancelled, or disputed.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Job History Archive]                                 │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─ Filtering options ───────────────────────────────────┐  │
│  │ Filter: [ Show All     ] [v]  Sort: [ Newest First ] [v] │  │  ◄── Filters Grid
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Historical Booking Logs ─────────────────────────────┐  │
│  │                                                       │  │
│  │  #UA-839D28 ── Boiler Repair              [ Completed ] │  │  ◄── Completed Badge
│  │  Jul 7, 2:00 PM  ·  Total: £85.00                       │  │
│  │  Review rating:  ★★★★★                                 │  │  ◄── Feedback stars
│  │                                                       │  │
│  │  #UA-281C33 ── Home Cleaning             [ Cancelled ] │  │  ◄── Danger Badge
│  │  Jun 30, 9:00 AM ·  Refunded (£30.00)                 │  │
│  │  Reason: Client cancelled booking.                    │  │
│  │                                                       │  │
│  │  #UA-110F43 ── Boiler Inspection          [ Disputed ] │  │  ◄── Warning Badge
│  │  Jun 15, 11:00 AM · Refund Held                       │  │
│  │  Ticket: #TKT-39281  (Open)                           │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Feedback indicators:** Display ratings directly as star graphics.
*   **Ticket Links:** Ticket codes (e.g. `#TKT-39281`) are formatted as clickable inline tags to route directly to support chat details.

---

## 9. Screen 9: Active In-App Client Chat

A messaging interface that allows providers to message customers regarding booking instructions while hiding actual phone numbers.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Chat: Sarah Jenkins]                     [Call Proxy]│  ◄── Header with Voice Mask
├────────────────────────────────────────────────────────────┤      Trigger Shortcut
│                                                            │
│  Booking #UA-839D28  · Boiler Repair                       │  ◄── Context Bar
│                                                            │
│  ┌─ Chat Messages Timeline ──────────────────────────────┐  │
│  │                                                       │  │
│  │ [System] Provider matched. Chat enabled.    [01:05 PM]│  │  ◄── System Notification
│  │                                                       │  │
│  │ [Sarah] Hello! Is there any parking available?[01:08 PM]│  │  ◄── Client Message Left
│  │                                                       │  │
│  │ [You] Yes, you can park in space 14.        [01:10 PM]│  │  ◄── Provider Message Right
│  │                                                       │  │
│  │ [Sarah] Perfect, see you soon.              [01:12 PM]│  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌── Form Input Area ──────────────────────────────────────┐  │
│  │  [ Write a message…                        ]   [ Send ] │  │  ◄── Message Input Form
│  └───┬─────────────────────────────────────────────────────┘  │
└──────┴─────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Bubble Alignment:** Customer messages are left-aligned in a light grey bubble; provider messages are right-aligned in a dark green bubble.
*   **Voice Proxy Header:** Triggering the "Call" action uses anonymized routing masks, maintaining strict privacy compliance.

---

## 10. Screen 10: Support Ticket Center & Disputes

Allows providers to raise complaints, request file updates, or dispute booking reviews.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Support Center]                                      │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Raise a Support Ticket                                    │  ◄── Title
│                                                            │
│  ┌─ Create Ticket Form ──────────────────────────────────┐  │
│  │ Booking Reference:                                    │  │
│  │ [ #UA-110F43 - Boiler Inspection            ] [v]      │  │  ◄── Selector
│  │                                                       │  │
│  │ Category:                                             │  │
│  │ [ Review Dispute / Rating Complaint          ] [v]      │  │  ◄── Category Selector
│  │                                                       │  │
│  │ Problem Description:                                  │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ Client rated 1-star due to pre-existing damage.  │  │  │  ◄── Text area
│  │ └──────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │ [ Submit Ticket ]                                     │  │  ◄── Action Button
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Open Tickets Queue ──────────────────────────────────┐  │
│  │                                                       │  │
│  │  #TKT-39281 ──  Review Dispute            [ In Review ] │  │  ◄── Progress Status
│  │  Created: Jul 6  ·  Status: Awaiting operational check│  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Ticket Status:** Color coding based on status (e.g. `In Review` in amber, `Open` in green, `Resolved` in gray).

---

## 11. Screen 11: Profile & Settings

Enables providers to check stats, verify bank accounts, and edit profile details.

```
┌────────────────────────────────────────────────────────────┐
│  UA  [Account Settings]                                    │  ◄── Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─ Profile Card ────────────────────────────────────────┐  │
│  │  [ Avatar ]  Rajesh Kumar                             │  │  ◄── Image & Name
│  │              Trade: Plumbing & Boiler Engineering      │  │
│  │              Status: Verified Pro       [ Approved ✔ ]│  │  ◄── KYC Status Badge
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ App Preferences ─────────────────────────────────────┐  │
│  │                                                       │  │
│  │  [ ] Receive push notifications alerts                 │  │  ◄── Push Toggle
│  │                                                       │  │
│  │  [ ] Enable offline matching alerts (SMS fallback)     │  │  ◄── SMS Toggle
│  │                                                       │  │
│  │  Language: [ English (UK)                   ] [v]      │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Actions ─────────────────────────────────────────────┐  │
│  │  [ Edit Personal Details ]                            │  │  ◄── Nav Link Buttons
│  │  [ Change Payout Bank Account ]                       │  │
│  │  [ Review Contractor B2B Agreement ]                  │  │
│  │                                                       │  │
│  │  [ Sign Out of Account ]  (Red text)                  │  │  ◄── Danger Link
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Visual Specifications
*   **Settings links:** Chevron indicators for submenus.
*   **Vetting status:** Includes an active badge linking to the document checklists (Screen 2) if document updates are required.
