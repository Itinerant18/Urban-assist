# Product

## Register

product

## Users

Homeowners and renters in the UK (London and South East first). Busy professionals who want vetted, reliable home help without phone-tag. They arrive with a job in mind ("leaking tap", "end-of-tenancy clean"), value fixed transparent pricing, and book on mobile as often as desktop. Trust is the deciding factor: they are letting a stranger into their home.

## Product Purpose

Urban Assist is a home-services marketplace: customers discover services by category or search, book a fixed-price slot, and the platform handles provider assignment, payment (Stripe or cash), messaging, and reviews. V1 uses **manual provider assignment by admins** — the customer books a time window; an admin matches the professional. Success = visitor→booking conversion, 90-day rebooking rate, sustained 4.5★+ average rating.

## Brand Personality

Premium, warm, trustworthy, calm (per docs/DESIGN-customer.md). Never loud or urgent except true semantic states (amber in-progress, rust errors/cancellations). British, plain-spoken copy; prices always £ with pence.

## Anti-references

- Gig-economy chaos: surge banners, countdown timers, pushy urgency (not Uber-at-peak).
- Discount-mart clutter: stacked promo badges, red starbursts, ALL-CAPS shouting.
- Cold enterprise SaaS: sterile grays, dense tables on customer-facing surfaces.

## Design Principles

1. **Trust before conversion** — verification badges, real reviews, transparent pricing beat aggressive CTAs.
2. **Guest-first funnel** — browse and choose anonymously; authenticate (OTP-only, no passwords) only at the point of commitment.
3. **One decision per screen** — the booking funnel is when → where → pay; never merge steps in ways that add cognitive load.
4. **The lifecycle is the product** — booking confirmation is the midpoint: status tracking, chat, job-start OTP, and the rate→rebook loop drive retention.
5. **Honest about V1** — manual assignment, no cart, no wallet ledger yet; UI never promises automation that doesn't exist.

## Accessibility & Inclusion

Mobile-responsive throughout (dual web/mobile homepage layouts already exist). Minimum 11px UI text per design system. WCAG AA contrast targets; body text ≥4.5:1. OTP auth must work for email and phone users. Reduced-motion alternatives for any animation.
