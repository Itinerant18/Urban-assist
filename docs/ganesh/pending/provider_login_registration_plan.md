# Implementation Plan: Provider Phone Auth & UK Sole Trader Registration (Updated)

This document outlines the execution plan to build the provider authentication flow using **UK-specific phone-based SMS OTP login** and a comprehensive **onboarding registration flow for individual self-employed professionals (Sole Traders)**. It incorporates the visual styles and themes of the Urban Assist design system.

---

## 1. Phase 1: Database Schema Modifications

We need to add individual professional credentials, tax numbers, and UK banking details to the provider profile database. Limited Company details (like CRNs) are excluded.

### 1.1. Create Migration File
Create `supabase/migrations/0009_provider_registration_fields.sql`:
```sql
-- Add UK sole-trader registration, vetting, and payout details

-- Identity
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;                   -- must be 18+ at registration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nino text;               -- National Insurance Number (e.g. QQ123456C)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utr_number text;         -- HMRC Unique Taxpayer Reference (10 digits) — optional at signup, required before first payout

-- Profile / trust signals
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_experience integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;                -- customer-facing "about me" text (max 500 chars)

-- Banking (UK domestic)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_holder_name text;       -- must match legal name
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_sort_code text;      -- 6-digit UK bank sort code
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number text; -- 8-digit UK bank account number

-- Coverage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS travel_radius_miles integer NOT NULL DEFAULT 10; -- max distance provider will travel

-- Gate
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_completed boolean NOT NULL DEFAULT false;

-- Add index to check registration completions quickly
CREATE INDEX IF NOT EXISTS profiles_registration_completed_idx ON profiles(registration_completed) WHERE role = 'provider';
```

### 1.2. Regenerate Types
After applying the migration, regenerate the TypeScript DB types:
```bash
pnpm db:types
```
This updates `packages/db/src/types.ts` with the new columns.

---

## 2. Phase 2: Backend API Endpoints (`apps/provider`)

We need two new API endpoints in the Provider Next.js app to handle phone verification kickoff and registration data submission.

### 2.1. Auth Start API: `apps/provider/app/api/auth/start/route.ts`
- **Purpose**: Kickoff Supabase Phone OTP.
- **Rules**:
  1. Extract phone number and check for UK mobile format: `+447` or `07` followed by 9 digits.
  2. Normalize format to E.164 (e.g. `07123456789` -> `+447123456789`).
  3. Reject any non-UK numbers.
  4. Invoke `supabase.auth.signInWithOtp` with the phone number, specifying the role `provider` in `options.data`.
  5. Include Upstash rate limiting protection by adapting the `otpRateLimit()` integration.

### 2.2. Register Profile API: `apps/provider/app/api/register/route.ts`
- **Purpose**: Submit and validate the registration details post-authentication.
- **Rules**:
  1. Guard the endpoint: check that the user is authenticated via `db.auth.getUser()`.
  2. Parse and validate the incoming registration payload using `zod`:
     - **Identity & Contact**
       - `full_name`: string, min 2 characters.
       - `email`: valid email string.
       - `date_of_birth`: ISO date string; must be at least 18 years before today.
     - **Business**
       - `business_name`: string, min 2 characters (trading name).
       - `nino`: valid UK National Insurance Number pattern (`/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i`).
       - `utr_number`: optional; if provided, must be exactly 10 digits (`/^\d{10}$/`).
       - `years_experience`: integer, min 0, max 60.
       - `bio`: string, max 500 characters.
       - `postcode`: valid UK postcode (matching `/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i`).
       - `travel_radius_miles`: integer, min 1, max 50.
     - **Bank Payout**
       - `bank_account_holder_name`: string, min 2 characters.
       - `bank_sort_code`: exactly 6 digits (`/^\d{6}$/`).
       - `bank_account_number`: exactly 8 digits (`/^\d{8}$/`).
  3. Geocode the postcode: Call `@urban-assist/integrations/postcode`'s `lookupPostcode` to get latitude/longitude.
  4. Perform database operations:
     - Update the user's row in `profiles`: set `full_name`, `email`, `date_of_birth`, `business_name`, `nino`, `utr_number`, `years_experience`, `bio`, `bank_account_holder_name`, `bank_sort_code`, `bank_account_number`, `travel_radius_miles`, role to `'provider'`, and `registration_completed` to `true`.
     - Upsert the resolved location coordinates into the `provider_location` table.
  5. Return success response.

---

## 3. Phase 3: Frontend UI Implementation (`apps/provider`)

To ensure visual consistency with the customer app, we will use the styles defined in `customer_theme_reference.md`.

### 3.1. Design Theme & Color Palette
- **Page Background**: Warm Stone (`#F5F1EB`)
- **Headers & Labels**: Slate Navy (`#1F3A4D`)
- **Body Text**: Charcoal (`#2B2B28`)
- **Primary CTAs**: Terracotta (`#C1622E` / hover `#A9531F`)
- **Inputs & Cards**: White background (`#FFFFFF`), rounded borders `14px` (`rounded-xl`), and borders in `#ECE6D9` (`border-hairline`) or `#E2DACB` (`input-border`).
- **Interactive Targets**: Minimum `44px` height (`tap`).

### 3.2. Refactor Login Form: `apps/provider/app/login/login-form.tsx`
- **Refactor**: Replace the email-based inputs with a UK phone validation input.
- **UX Controls**:
  - Prepend a fixed `🇬🇧 +44` prefix selector (locked to prevent changing to other countries).
  - Enforce telephone numeric-only inputs.
  - Verification screen: Enter 6-digit OTP code received via SMS, calling `supabase.auth.verifyOtp` (type: `'sms'`).
  - Upon successful auth, query the user profile. If `registration_completed` is `false`, redirect to `/register`, else redirect to the dashboard (`/`).

### 3.3. Create Registration Form: `apps/provider/app/register/page.tsx`
- **Purpose**: A multi-step form to collect information before allowing access to the dashboard.
- **UI Sections**:
  1. **Section 1: Personal Details**
     - Full Name
     - Email Address
     - Date of Birth (date picker — 18+ validation shown inline)
  2. **Section 2: Business & Coverage**
     - Trading / Business Name
     - National Insurance Number (NINO)
     - UTR Number *(optional — labelled "You can add this later before your first payout")*
     - Years of Experience (number stepper, 0–60)
     - About You / Bio (textarea, 500 char limit with counter)
     - Operating Postcode
     - Travel Radius in miles (slider or select: 5 / 10 / 15 / 20 / 30 / 50)
  3. **Section 3: Bank Payout Details**
     - Account Holder Name *(hint: must match your legal name)*
     - Sort Code (6 digits, formatted as XX-XX-XX)
     - Account Number (8 digits)
- **On Submit**: Post the validated inputs to `/api/register`. On success, redirect to `/onboarding` to upload documents.

---

## 4. Phase 4: Access Controls and Flow Guards

### 4.1. Refactor Layout Guard: `apps/provider/app/(app)/layout.tsx`
Ensure that authenticated users with incomplete registrations are blocked from the main application dashboard:
- Query `profiles.registration_completed` on the authenticated user.
- If `registration_completed` is `false` or missing, execute a Next.js `redirect('/register')`.
- Ensure `/register` itself is excluded from this layout so it does not trigger an infinite redirect loop (e.g. by keeping it outside the `(app)` router group).

### 4.2. Register Page Guard: `apps/provider/app/register/page.tsx`
Prevent already-registered providers from re-entering the registration flow:
- At the top of the page (server component), call `getSupabaseServer().auth.getUser()`.
- If no session → `redirect('/login')`.
- If session exists and `profiles.registration_completed` is `true` → `redirect('/')`.
- Only render the registration form if authenticated AND `registration_completed` is `false`.

---

## 5. Phase 5: Verification & Testing Plan

1. **Local Migration Setup**:
   Run database reset locally to apply the updated columns:
   ```bash
   pnpm db:migrate
   ```
2. **Auth Verification**:
   - Navigate to `http://localhost:3001/login`.
   - Attempt login with a non-UK number (verify it is rejected).
   - Enter a valid UK phone number, verify OTP, and ensure it registers a new Supabase user.
3. **Onboarding Guard Verification**:
   - Once authenticated, verify the system automatically redirects the browser to the `/register` screen.
   - Try navigating to `/schedule` or `/earnings` manually and verify the layout guard redirects you back to `/register`.
4. **Registration Verification**:
   - Complete the `/register` form with all required fields:
     - Full name, email, DOB (18+ age), NINO, business name, postcode (e.g. `SW1A 1AA`), travel radius, years experience, bio, account holder name, sort code, account number.
     - Leave UTR blank — confirm form still submits successfully.
   - Submit and verify:
     - The `profiles` table is updated with all new columns including `date_of_birth`, `bio`, `years_experience`, `bank_account_holder_name`, `travel_radius_miles`.
     - The `provider_location` table receives geocoded lat/lng matching the postcode.
     - The user is redirected to `/onboarding` to upload documents.
   - **Negative tests**:
     - Submit with a DOB under 18 — expect validation error.
     - Submit with invalid NINO format — expect validation error.
     - Submit with UTR that is not 10 digits — expect validation error.
     - Submit with sort code not exactly 6 digits — expect validation error.
     - Submit with account number not exactly 8 digits — expect validation error.
