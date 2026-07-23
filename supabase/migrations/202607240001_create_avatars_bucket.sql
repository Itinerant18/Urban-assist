-- The avatars RLS policies (0008) were written against a bucket that the
-- migrations never created (the header there notes buckets are made via the
-- dashboard). Create it here so avatar uploads work on a fresh environment.
-- Public bucket: 0008 already grants "avatars public read".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
