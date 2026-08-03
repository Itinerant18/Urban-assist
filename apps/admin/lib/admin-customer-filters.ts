export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** City / postcode filter for customer directory. */
export function readCustomerListFilters(
  searchParams: Record<string, string | string[] | undefined>,
): { q: string | null; city: string | null; postcode: string | null } {
  const q = firstSearchParam(searchParams.q)?.trim() || null;
  const city = firstSearchParam(searchParams.city)?.trim() || null;
  const postcode = firstSearchParam(searchParams.postcode)?.trim().toUpperCase() || null;
  return { q, city, postcode };
}
