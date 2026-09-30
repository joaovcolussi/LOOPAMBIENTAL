const EARTH_RADIUS_KM = 6371;

export type Coordinates = { latitude: number; longitude: number };

export function geoPoint(value: unknown): Coordinates | undefined {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude))
    return undefined;
  return { latitude, longitude };
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Great-circle distance in kilometers (haversine). */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Latitude/longitude bounding box for a radius, used to prefilter by index. */
export function boundingBox(
  center: Coordinates,
  radiusKm: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / 111.32;
  const cos = Math.cos(toRadians(center.latitude));
  const lngDelta =
    Math.abs(cos) < 1e-6 ? 180 : radiusKm / (111.32 * Math.abs(cos));
  return {
    minLat: Math.max(-90, center.latitude - latDelta),
    maxLat: Math.min(90, center.latitude + latDelta),
    minLng: Math.max(-180, center.longitude - lngDelta),
    maxLng: Math.min(180, center.longitude + lngDelta),
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
