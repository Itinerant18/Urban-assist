# Domain cutover runbook — deferred until a real domain exists

Everything here is blocked on owning `urbanassist.co.uk` (or whatever the final domain is)
and a Cloudflare account. None of it is urgent, and doing it before the platform work below
is settled means debugging two layers at once.

Written 2026-08-08, after the hardening rounds that merged as `fb9f7d7`, `ea1265b`,
`b5d0bbd`, `4e48127`, `7f97ed4` and `7d406a4`. The app-side groundwork is already in place —
what remains is dashboard configuration plus a small amount of code that cannot be written or
tested without the real hostnames.

---

## Do these first — they are not domain-dependent

Listed here because the cutover will hide them if they are still outstanding.

1. **Sentry env vars are not in Vercel.** They exist only in the gitignored per-app `.env`,
   so Sentry is inert in every deployed environment. Set per project:
   `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG=urban-assist`,
   `SENTRY_PROJECT=urbanassist`, `SENTRY_AUTH_TOKEN` (build-time only, never public),
   and the two sample-rate vars. Do **not** set `SENTRY_URL` — the auth token embeds its
   region and Sentry warns on every build when it disagrees.

2. **Confirm `UPSTASH_REDIS_REST_URL` / `_TOKEN` are present in all three Vercel projects.**
   This is the highest-risk unknown in the stack. Without them the Redis client falls back to
   an in-memory shim (`packages/integrations/src/redis/client.ts`): every rate limiter returns
   `null` and no-ops, and `acquireLock` returns `true` unconditionally — so booking locks are
   *off*, not degraded, with no error anywhere. The fail-loud check that would surface this is
   deliberately unshipped until parity is confirmed, because shipping it into a project that
   is already missing the vars converts a silent degradation into an outage.

3. **`CRON_SECRET` is absent everywhere**, so `/api/cron/aggregate` returns 503 and the admin
   dashboard stats never refresh. Also missing against `.env.example`: `NEXT_PUBLIC_APP_ID`,
   `NEXT_PUBLIC_PROVIDER_APP_URL`, `SUPPORT_NOTIFICATION_WEBHOOK`.

4. **Verify pg_cron is actually scheduled.** In the Supabase SQL editor:

   ```sql
   select jobname, schedule, active from cron.job;
   ```

   Expect `notification-dispatch-every-minute`, `match-cascade-tick-every-minute` and
   `prune-stripe-webhook-events`. **If the cascade tick is missing, offers never advance on
   their own** and bookings sit unmatched until someone intervenes — a bigger operational
   problem than anything in this runbook.

---

## Code that still needs writing (needs the real hostnames to test)

### Turnstile

Not started. Requires:

- the widget in the signup, login-recovery and provider-onboarding forms
- a server-side verification step before the OTP send / registration proceeds
- `https://challenges.cloudflare.com` added to **both** `script-src` and `frame-src` in
  `tooling/security-headers.js`. The CSP currently has neither, so the widget will be blocked
  the moment the policy moves from Report-Only to enforcing.

### Origin lock

The single most important piece, because two things already shipped depend on it:

- `getClientIp()` (`packages/utils/src/client-ip.ts`) ignores `cf-connecting-ip` unless
  `TRUST_CLOUDFLARE_CLIENT_IP` is set. That header is only trustworthy for traffic that
  actually came through Cloudflare — while the Vercel deployment URLs stay publicly
  reachable, anyone can bypass Cloudflare and forge it. **Enable the flag in the same change
  that locks the origin, never before.**
- Once Cloudflare is in front and the flag is on, `x-real-ip` and `x-vercel-forwarded-for`
  hold the Cloudflare *edge* address. `getClientIp` deliberately does not fall back to them
  in that mode, because doing so would put every user behind one colo into a single
  rate-limit bucket.

Pick one: Cloudflare Authenticated Origin Pulls, Vercel deployment protection, or a
Cloudflare-set secret header verified in middleware.

### CSP enforcement

The CSP ships as `Content-Security-Policy-Report-Only` with a collector at
`/api/csp-report`. Before switching the header to enforcing, watch the reports for real
traffic. Known origins already allowed: Stripe (incl. 3DS frames), Supabase signed-URL
iframes for admin KYC review, Google Maps embeds, and `www.gstatic.com` for the FCM service
workers. There is no `report-uri` collector aggregation — reports are logged only, so plan
to read them from the platform log drain.

---

## Dashboard configuration

### DNS

```
urbanassist.co.uk           -> marketing / customer app
app.urbanassist.co.uk       -> customer app
provider.urbanassist.co.uk  -> provider app
admin.urbanassist.co.uk     -> admin app
```

Two ordering rules — these are the top two ways this topology fails:

1. **Add each record DNS-only (grey cloud) first.** Let Vercel verify the domain and issue
   its certificate, *then* switch to proxied. Going straight to orange cloud blocks cert
   issuance.
2. **Set SSL/TLS mode to Full (strict) before proxying.** Flexible mode in front of Vercel
   causes infinite redirect loops.

### WAF, bot protection, rate limiting

Managed rules on; DDoS protection on. Bot protection and rate limiting on login, signup,
booking creation and document upload.

**Two paths need explicit handling, and both fail silently if missed:**

- `/api/*` — bypass caching entirely. These are per-user or mutations.
- `/api/monitoring` — the Sentry tunnel. Unauthenticated by design (the browser posts error
  envelopes there so ad blockers cannot drop them). It is already pinned to our own Sentry
  project and rate-limited in-app, so **rate-limit it rather than blocking it**. A bot rule
  that challenges it means client-side error reporting quietly stops arriving, with no
  symptom other than an empty Sentry.

### Cache rules

Cache **only** `/_next/static/*` and public assets. Explicit bypass for `/api/*`, all
authenticated HTML, booking and payment responses, and anything touching KYC.

The app already defends itself here: `markPrivate()` in `packages/db/src/middleware.ts` sets
`Cache-Control: private, no-store`, `CDN-Cache-Control: private, no-store` and appends
`Vary: Cookie` to every protected-route response including redirects, and `/api/*` gets the
same from a `headers()` rule. Cloudflare honours `CDN-Cache-Control` even when a page rule
overrides `Cache-Control`. Treat that as a safety net, not a licence to write a loose rule —
**a cache rule that catches authenticated HTML serves one customer's page to another**, which
is the worst outcome available in this stack.

Public pages are deliberately still cacheable (`/login` returns `s-maxage=31536000`), so do
not blanket-disable caching either.

---

## Things that break on a domain change if forgotten

- **Supabase Auth Site URL and redirect allowlist** must include every new hostname, or login
  breaks on the new domains. This is the most commonly missed item.
- **Stripe webhook endpoint URL** if the customer app's domain changes. The webhook is at
  `/api/stripe/webhook` on the customer app.
- `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_PROVIDER_APP_URL` per Vercel project.
- Firebase authorised domains, if FCM/web push is in use on the new hostnames.

---

## Verification after cutover

```bash
# 1. No redirect loop, HSTS present, on all four hostnames.
for h in urbanassist.co.uk app.urbanassist.co.uk provider.urbanassist.co.uk admin.urbanassist.co.uk; do
  curl -sI "https://$h" | grep -iE '^(HTTP|location|strict-transport-security)'
done

# 2. Authenticated HTML and API must NOT be cached at the edge.
curl -sI https://app.urbanassist.co.uk/account   | grep -i 'cf-cache-status\|cache-control'
curl -sI https://app.urbanassist.co.uk/api/quote | grep -i 'cf-cache-status\|cache-control'
# expect cf-cache-status: BYPASS (or DYNAMIC), and private/no-store

# 3. Static assets SHOULD be cached.
curl -sI https://app.urbanassist.co.uk/_next/static/... | grep -i 'cf-cache-status'

# 4. The Sentry tunnel must not be challenged or redirected.
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://app.urbanassist.co.uk/api/monitoring \
  -H 'content-type: application/x-sentry-envelope' --data-binary '{"dsn":"<public dsn>"}
{"type":"event"}
{"message":"cutover check"}'
# expect 200, and the event appears in Sentry
```

5. **Log in as two different customers through the proxy and confirm neither sees the
   other's cached page.** No automated check substitutes for this.
6. Confirm the client IP is real, not a Cloudflare edge address: trigger an admin action and
   check `audit_log.ip_address`. If it shows a Cloudflare IP, `TRUST_CLOUDFLARE_CLIENT_IP` is
   not set.
7. Re-run the end-to-end booking loop against the new hostnames: book → dispatch → provider
   accept → start code → complete → pay (card and cash) → review.

## Rollback

Set the DNS records back to grey cloud. That removes Cloudflare from the path without
touching Vercel or the apps.

**Unset `TRUST_CLOUDFLARE_CLIENT_IP` at the same time.** With the flag on and no Cloudflare in
front, `cf-connecting-ip` is absent and `getClientIp()` returns null by design — it will not
fall back to the platform headers in that mode. Consequences: the OTP route skips its per-IP
bucket entirely (per-number limiting still applies, so cost stays bounded but enumeration
protection is lost), and the Sentry tunnel drops to one shared 120/min bucket across all
clients. Neither is an outage, but both are silent.
