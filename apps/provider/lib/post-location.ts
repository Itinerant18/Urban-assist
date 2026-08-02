/**
 * Push the device's current position to /api/location.
 *
 * Two things depend on this and neither worked, because nothing called the route:
 *  - matching: findCandidates() scores candidates by distance, reading
 *    provider_location (and its Redis mirror). Without updates it only ever saw the
 *    home postcode geocoded once at registration.
 *  - customer live tracking: apps/customer .../booking-detail.tsx subscribes to
 *    provider_location changes to move the map pin while a provider is on the way.
 *
 * ponytail: fire-and-forget with silent failure. Location is an enhancement, never a
 * gate — a denied permission or a provider on a desktop must not block going online
 * or advancing a job status. Returns whether it landed, for callers that care.
 */
export async function postCurrentLocation(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return false;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      });
    });

    const res = await fetch('/api/location', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
    });
    return res.ok;
  } catch {
    // Permission denied, timeout, or offline. Not actionable for the provider.
    return false;
  }
}
