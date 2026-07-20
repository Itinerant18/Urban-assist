-- Seed: standard UK home-service categories
insert into service_categories (slug, name, icon, description, min_price_pence, max_price_pence, sort_order) values
  ('cleaning',          'Home cleaning',     'sparkles',   'Regular and deep cleaning for homes and flats', 1500, 15000, 1),
  ('plumbing',          'Plumbing',          'wrench',     'Leaks, blockages, installations and repairs',     3500, 30000, 2),
  ('electrical',        'Electrical',        'zap',        'Certified electrical work and safety checks',     4000, 40000, 3),
  ('gardening',         'Gardening',         'leaf',       'Lawn care, hedge trimming and garden tidy-ups',   2000, 20000, 4),
  ('appliance-repair',  'Appliance repair',  'settings',   'Washing machines, ovens, fridges and dryers',     3500, 25000, 5),
  ('handyman',          'Handyman',          'hammer',     'Small jobs around the house — mounting, fixing',  2500, 20000, 6),
  ('painting',          'Painting & decor',  'paintbrush', 'Interior and exterior decorating',                4000, 50000, 7),
  ('locksmith',         'Locksmith',         'lock',       'Lock-outs, lock changes and security upgrades',   5000, 30000, 8),
  ('carpentry',         'Carpentry',         'tool',       'Custom woodwork, doors, flooring and fitted furniture', 5000, 50000, 9),
  ('pest-control',      'Pest Control',      'bug',        'Professional pest identification and treatment', 5000, 30000, 10),
  ('heating-gas',       'Heating & Gas',     'flame',      'Boiler, heating and gas safety services', 5000, 40000, 11),
  ('air-conditioning',  'Air Conditioning',  'snowflake',  'Installation, repair and servicing for AC systems', 8000, 50000, 12),
  ('roofing',           'Roofing',           'house',      'Roof repairs, replacement and guttering', 5000, 50000, 13),
  ('moving-services',   'Moving Services',   'truck',      'House moves, packing and man & van services', 2000, 50000, 14)
on conflict (slug) do nothing;

-- Seed a couple of promo codes for demos
insert into promo_codes (code, discount_type, discount_value, expires_at) values
  ('WELCOME10', 'percent', 10, now() + interval '90 days'),
  ('FIRST5GBP', 'fixed',  500, now() + interval '90 days')
on conflict (code) do nothing;
