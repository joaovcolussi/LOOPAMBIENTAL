import {
  boundingBox,
  distanceKm,
  geoPoint,
  isValidLatitude,
  isValidLongitude,
} from '../src/common/geo';

describe('geo helpers', () => {
  const saoPaulo = { latitude: -23.5505, longitude: -46.6333 };
  const joinville = { latitude: -26.3044, longitude: -48.8487 };

  it('validates latitude and longitude ranges', () => {
    expect(isValidLatitude(-23.55)).toBe(true);
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLongitude(-46.63)).toBe(true);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLatitude(Number.NaN)).toBe(false);
  });

  it('parses a coordinate pair, ignoring invalid input', () => {
    expect(geoPoint({ latitude: '-23.5', longitude: '-46.6' })).toEqual({
      latitude: -23.5,
      longitude: -46.6,
    });
    expect(geoPoint({ latitude: 'abc', longitude: 10 })).toBeUndefined();
    expect(geoPoint(null)).toBeUndefined();
  });

  it('computes a realistic haversine distance', () => {
    const distance = distanceKm(saoPaulo, joinville);
    expect(distance).toBeGreaterThan(350);
    expect(distance).toBeLessThan(420);
  });

  it('builds a bounding box around the center', () => {
    const box = boundingBox(saoPaulo, 100);
    expect(box.minLat).toBeLessThan(saoPaulo.latitude);
    expect(box.maxLat).toBeGreaterThan(saoPaulo.latitude);
    expect(box.minLng).toBeLessThan(saoPaulo.longitude);
    expect(box.maxLng).toBeGreaterThan(saoPaulo.longitude);
  });
});
