import { UK_POSTCODE_RE } from '@urban-assist/utils';
import { getCached, setCached, postcodeCacheKey, TTL } from '@urban-assist/integrations/redis';

/** One selectable premise from the premium lookup. */
export interface PostcodeAddress {
  line1: string;
  line2: string | null;
  city: string;
  /** Single-line rendering for the picker. */
  formatted: string;
}

export interface PostcodeResult {
  postcode: string;
  lat: number;
  lng: number;
  /** Electoral ward — a locality, NOT a postal town. Never write it to `city`. */
  admin_ward: string | null;
  /** Local authority district — the right answer for "Town / city". */
  admin_district: string | null;
  region: string | null;
  addresses?: PostcodeAddress[];
}

export async function lookupPostcode(raw: string): Promise<PostcodeResult | null> {
  const pc = raw.replace(/\s+/g, '').toUpperCase();
  if (!UK_POSTCODE_RE.test(pc)) return null;

  const cacheKey = postcodeCacheKey(pc);
  const cached = await getCached<PostcodeResult>(cacheKey);
  if (cached) return cached;

  const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
  if (!r.ok) return null;
  const j = await r.json();
  const d = j.result;
  if (!d) return null;

  const base: PostcodeResult = {
    postcode: d.postcode,
    lat: d.latitude,
    lng: d.longitude,
    admin_ward: d.admin_ward ?? null,
    admin_district: d.admin_district ?? null,
    region: d.region ?? null,
  };

  const key = process.env.POSTCODE_LOOKUP_API_KEY;
  if (key) {
    try {
      const ar = await fetch(
        `https://api.getAddress.io/find/${encodeURIComponent(pc)}?api-key=${key}&expand=true`,
      );
      if (ar.ok) {
        const aj = await ar.json();
        // Kept structured so the picker can autofill the individual fields —
        // a pre-joined string can only be pasted into line 1.
        base.addresses = (aj.addresses ?? []).map((a: any): PostcodeAddress => {
          const line1 = [a.line_1, a.line_2].filter(Boolean).join(', ');
          const line2 = [a.line_3, a.line_4].filter(Boolean).join(', ') || null;
          const city = a.town_or_city ?? base.admin_district ?? '';
          return {
            line1,
            line2,
            city,
            formatted: [line1, line2, city].filter(Boolean).join(', '),
          };
        });
      }
    } catch {
      /* premium lookup is optional */
    }
  }

  await setCached(cacheKey, base, TTL.POSTCODE_CACHE);
  return base;
}
