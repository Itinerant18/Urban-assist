export type AdminProviderListFilters = {
  kyc: 'pending' | 'approved' | 'rejected' | null;
  categoryId: string | null;
  /** incomplete = any offered gated category not passed; eligible = none incomplete (or eligible for selected category). */
  training: 'incomplete' | 'eligible' | null;
  /** Coverage postcode prefix (matches provider_service_areas.postcode_pattern). */
  postcode: string | null;
  /** City: own address city OR covers postcodes known in that city. */
  city: string | null;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function readProviderFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminProviderListFilters {
  const kycRaw = firstParam(searchParams.kyc);
  const kyc =
    kycRaw === 'pending' || kycRaw === 'approved' || kycRaw === 'rejected' ? kycRaw : null;
  const categoryId = firstParam(searchParams.category) || null;
  const trainingRaw = firstParam(searchParams.training);
  const training =
    trainingRaw === 'incomplete' || trainingRaw === 'eligible' ? trainingRaw : null;
  const postcode =
    firstParam(searchParams.postcode)?.trim().toUpperCase().replace(/\s+/g, '') || null;
  const city = firstParam(searchParams.city)?.trim() || null;
  return { kyc, categoryId, training, postcode, city };
}

/** Providers whose area pattern is a prefix of any postcode known in the city. */
export function providerIdsCoveringCityPostcodes(
  areas: { provider_id: string; postcode_pattern: string }[],
  cityPostcodes: string[],
): Set<string> {
  const ids = new Set<string>();
  const normalized = cityPostcodes
    .map((pc) => pc.toUpperCase().replace(/\s+/g, ''))
    .filter(Boolean);
  if (normalized.length === 0) return ids;

  for (const area of areas) {
    const pattern = area.postcode_pattern.toUpperCase().replace(/\s+/g, '');
    if (!pattern) continue;
    if (normalized.some((pc) => pc.startsWith(pattern))) {
      ids.add(area.provider_id);
    }
  }
  return ids;
}
