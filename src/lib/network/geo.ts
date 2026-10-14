/**
 * Coarse-location helpers. Find a Friend never stores exact coordinates:
 * everything is rounded to a ~500 m grid before it leaves the device, and
 * rounded again on the server in case a client doesn't.
 */

const GRID_DEG = 0.005; // ≈ 555 m of latitude

export function roundCoord(value: number): number {
  return Math.round(value / GRID_DEG) * GRID_DEG;
}

export function coarsen(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: Number(roundCoord(lat).toFixed(3)), lng: Number(roundCoord(lng).toFixed(3)) };
}

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash; precision 6 ≈ a 1.2 km × 0.6 km cell. */
export function geohash(lat: number, lng: number, precision = 6): string {
  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let hash = "";
  let bit = 0;
  let ch = 0;
  let evenBit = true;
  while (hash.length < precision) {
    const range = evenBit ? lngRange : latRange;
    const value = evenBit ? lng : lat;
    const mid = (range[0] + range[1]) / 2;
    if (value >= mid) {
      ch = (ch << 1) | 1;
      if (evenBit) lngRange = [mid, range[1]];
      else latRange = [mid, range[1]];
    } else {
      ch = ch << 1;
      if (evenBit) lngRange = [range[0], mid];
      else latRange = [range[0], mid];
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** Distances shown to other users are rounded to 0.5 km so nobody can be pinpointed. */
/**
 * Distance shown to other people, in coarse bands so repeated searches can't
 * be combined to narrow down where someone is: under 1 km, then whole km up
 * to 5, then steps of 5 km.
 */
export function approxDistanceKm(km: number): number {
  if (km < 1) return 1;
  if (km < 5) return Math.ceil(km);
  return Math.ceil(km / 5) * 5;
}

/**
 * Moves a (already grid-rounded) search location by a random distance of up
 * to `maxMeters`, fresh for every search, so the stored point isn't the
 * user's exact grid cell either.
 */
export function jitter(lat: number, lng: number, maxMeters = 250): { lat: number; lng: number } {
  const r = maxMeters * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(theta)) / 111_320;
  const dLng = (r * Math.sin(theta)) / (111_320 * Math.cos((lat * Math.PI) / 180) || 1);
  return { lat: Number((lat + dLat).toFixed(4)), lng: Number((lng + dLng).toFixed(4)) };
}
