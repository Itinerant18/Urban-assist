-- Fix the seed in 202608020004, which was not actually idempotent.
--
-- That migration ends with `insert into training_items ... on conflict do nothing`.
-- A bare ON CONFLICT only suppresses a *constraint violation*, and training_items has
-- no unique constraint covering (category_id, title) — so there was nothing to
-- conflict with and re-running the migration inserted a second copy of all five
-- seeded items. It surfaced the moment the migration was replayed to record it in
-- the history table, and /training would have listed everything twice.
--
-- Fixed forward rather than by editing 202608020004, which is already recorded as
-- applied. The unique index below also makes that migration's ON CONFLICT clause do
-- what it always claimed to, so a fresh environment gets one copy.

-- Keep the earliest row per (category_id, title); drop the rest.
-- Safe: provider_training_completions is empty, so no completion points at a row
-- being removed. It also cascades on delete if that ever changes.
delete from public.training_items t
where exists (
  select 1
    from public.training_items keep
   where keep.title = t.title
     and keep.category_id is not distinct from t.category_id
     and (keep.created_at, keep.id) < (t.created_at, t.id)
);

-- category_id is nullable and NULLs do not compare equal in a plain unique index, so
-- platform-wide items (null category) would still be duplicable. Coalescing to a
-- sentinel makes them comparable.
create unique index if not exists training_items_unique_title_idx
  on public.training_items (
    coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
    title
  );
