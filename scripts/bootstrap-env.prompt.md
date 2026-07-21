# Urban Assist — Bootstrap Environment Files

You are setting up the `.env` files for an urban-assist monorepo.
The project root is `C:\workspace\urban-assist` (or wherever the repo was cloned).

## Instructions

Create these 4 env files. Every variable that has a value below must be written **exactly** as shown.

---

### File 1: `apps/customer/.env`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xouanfmyieodnqmmkuxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjg1MjYsImV4cCI6MjA5ODkwNDUyNn0.ujCyyogMY4s-z-CF9eU0cTSGPDgilb8eHzs7qEe81oQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyODUyNiwiZXhwIjoyMDk4OTA0NTI2fQ._4z3ofPyN6-01jROMgkjq_VBk3TKgTjL8MVEruECHvM

# Firebase (push notifications only)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://right-kiwi-106716.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAaDcAAIgcDE4MjVkOWU4NmU1ZTE0NmYxOGZiZGU5NmE0MWE1ZTY5MA

# Maps / address lookup
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
POSTCODE_LOOKUP_API_KEY=

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_CURRENCY=GBP
NEXT_PUBLIC_VAT_RATE=0.20
```

---

### File 2: `apps/provider/.env`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xouanfmyieodnqmmkuxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjg1MjYsImV4cCI6MjA5ODkwNDUyNn0.ujCyyogMY4s-z-CF9eU0cTSGPDgilb8eHzs7qEe81oQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyODUyNiwiZXhwIjoyMDk4OTA0NTI2fQ._4z3ofPyN6-01jROMgkjq_VBk3TKgTjL8MVEruECHvM

# Firebase (push notifications only)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://right-kiwi-106716.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAaDcAAIgcDE4MjVkOWU4NmU1ZTE0NmYxOGZiZGU5NmE0MWE1ZTY5MA

# Maps / address lookup
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
POSTCODE_LOOKUP_API_KEY=

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_CURRENCY=GBP
NEXT_PUBLIC_VAT_RATE=0.20
```

---

### File 3: `apps/admin/.env`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xouanfmyieodnqmmkuxi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjg1MjYsImV4cCI6MjA5ODkwNDUyNn0.ujCyyogMY4s-z-CF9eU0cTSGPDgilb8eHzs7qEe81oQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyODUyNiwiZXhwIjoyMDk4OTA0NTI2fQ._4z3ofPyN6-01jROMgkjq_VBk3TKgTjL8MVEruECHvM

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://right-kiwi-106716.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAaDcAAIgcDE4MjVkOWU4NmU1ZTE0NmYxOGZiZGU5NmE0MWE1ZTY5MA

# Maps / address lookup
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
POSTCODE_LOOKUP_API_KEY=

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_DEFAULT_CURRENCY=GBP
NEXT_PUBLIC_VAT_RATE=0.20
```

---

### File 4: `.env.local` (root — Dev/edge-function env vars)

```env
FIREBASE_SERVICE_ACCOUNT_JSON=
SUPPORT_NOTIFICATION_WEBHOOK=
```

---

### File 5: Verifying

After creating all files, verify:
1. `apps/customer/.env` — exists (30 lines)
2. `apps/provider/.env` — exists (30 lines)
3. `apps/admin/.env` — exists (51 lines)
4. `.env.example` — exists at root (52 lines, git-tracked)

Then update `.env.example` and `.gitignore` if needed to ensure only `.env.example` is tracked (the actual `.env` files should be gitignored already — check `.gitignore` contains `.env`).
