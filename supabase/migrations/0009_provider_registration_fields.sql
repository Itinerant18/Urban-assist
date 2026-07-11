-- UK sole-trader registration, vetting, and payout details for providers.
-- Limited Company fields (CRN etc.) intentionally excluded — sole traders only in V1.

-- Identity
alter table profiles add column if not exists date_of_birth date;             -- must be 18+ at registration (enforced in API)
alter table profiles add column if not exists business_name text;             -- trading name shown to customers
alter table profiles add column if not exists nino text;                      -- National Insurance Number (e.g. QQ123456C)
alter table profiles add column if not exists utr_number text;                -- HMRC Unique Taxpayer Reference (10 digits) — optional at signup, required before first payout

-- Profile / trust signals
alter table profiles add column if not exists years_experience integer not null default 0;
alter table profiles add column if not exists bio text;                       -- customer-facing "about me" (max 500 chars, enforced in API)

-- Banking (UK domestic — sort code + account number, not IBAN)
alter table profiles add column if not exists bank_account_holder_name text;  -- must match legal name
alter table profiles add column if not exists bank_sort_code text;            -- 6 digits
alter table profiles add column if not exists bank_account_number text;      -- 8 digits

-- Coverage
alter table profiles add column if not exists travel_radius_miles integer not null default 10;

-- Registration gate — dashboard access blocked until true
alter table profiles add column if not exists registration_completed boolean not null default false;

create index if not exists profiles_registration_completed_idx
  on profiles(registration_completed) where role = 'provider';
