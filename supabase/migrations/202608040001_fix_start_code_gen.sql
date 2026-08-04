-- Re-declare generate_booking_start_code using pg_catalog.* helpers so it runs
-- under search_path='' on Supabase (where pgcrypto lives in a different schema).
-- The remote DB still has the older body that calls gen_random_bytes(2), which
-- fails with "function gen_random_bytes(integer) does not exist" and blocks ALL
-- booking creation via the after-insert trigger on bookings.

create or replace function public.generate_booking_start_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  random_bytes bytea;
  code_number integer;
begin
  random_bytes := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  code_number := (get_byte(random_bytes, 0) * 256 + get_byte(random_bytes, 1)) % 10000;
  return lpad(code_number::text, 4, '0');
end;
$$;

revoke all on function public.generate_booking_start_code() from public, anon, authenticated;
