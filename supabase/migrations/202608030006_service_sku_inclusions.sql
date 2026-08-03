-- SKU inclusions / exclusions for catalog detail (admin-editable, public-readable).
-- Training gating stays on training_items.gates_category (category-level); admin UI surfaces that separately.

alter table public.service_skus
  add column if not exists inclusions text[] not null default '{}',
  add column if not exists exclusions text[] not null default '{}';

comment on column public.service_skus.inclusions is
  'What is included in this service (customer-facing bullet list).';
comment on column public.service_skus.exclusions is
  'What is not included / customer must prepare (customer-facing bullet list).';
