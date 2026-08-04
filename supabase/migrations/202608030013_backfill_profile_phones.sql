-- profiles.phone drifted from auth.users.phone in format and VALUE (live case:
-- profile ...788 vs auth ...789). auth.users is what OTP authenticates, so it
-- is truth. One-time realignment; app-side saves may re-add a '+' prefix later,
-- which is a format difference only — role_for_phone() and this backfill both
-- key on auth.users, so drift in value cannot recur from the app.
update public.profiles p
set phone = u.phone
from auth.users u
where u.id = p.id
  and u.phone is not null
  and p.phone is distinct from u.phone;
