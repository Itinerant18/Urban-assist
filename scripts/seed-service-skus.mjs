import { readFileSync } from 'node:fs';

const ROOT = 'C:/workspace/urban-assist';
const env = readFileSync(`${ROOT}/apps/admin/.env`, 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
const URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// Extract and eval the SERVICE_CATEGORIES array literal (trusted local data).
const src = readFileSync(`${ROOT}/apps/customer/lib/services-data.ts`, 'utf8');
const start = src.indexOf('[', src.indexOf('SERVICE_CATEGORIES'));
const end = src.indexOf('\n];', start);
const CATS = eval(src.slice(start, end + 2));

async function rest(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: H, ...opts });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}
const upsert = (table, onConflict, row) =>
  rest(`${table}?on_conflict=${onConflict}&select=id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });

const cats = await rest('service_categories?select=id,slug');
const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));

let subN = 0, skuN = 0, missing = [];
for (const cat of CATS) {
  const categoryId = catIdBySlug.get(cat.slug);
  if (!categoryId) { missing.push(cat.slug); continue; }
  let so = 0;
  for (const sub of cat.subcategories ?? []) {
    const [subRow] = await upsert('service_subcategories', 'category_id,slug', {
      category_id: categoryId,
      slug: sub.slug,
      name: sub.name,
      description: sub.description ?? null,
      icon: sub.icon ?? null,
      sort_order: sub.sortOrder ?? ++so,
    });
    subN++;
    let sso = 0;
    for (const svc of sub.services ?? []) {
      await upsert('service_skus', 'subcategory_id,slug', {
        subcategory_id: subRow.id,
        slug: svc.slug,
        name: svc.name,
        description: svc.description ?? null,
        min_price_pence: svc.minPricePence ?? 0,
        max_price_pence: svc.maxPricePence ?? 0,
        duration_mins: svc.durationMins ?? null,
        is_popular: !!svc.isPopular,
        sort_order: ++sso,
      });
      skuN++;
    }
  }
}
console.log(`seeded: ${subN} subcategories, ${skuN} skus`);
if (missing.length) console.log(`WARN categories not in DB (skipped): ${missing.join(', ')}`);
