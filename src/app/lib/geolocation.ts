/**
 * Geolocation & Geofencing utilities for OJT Tracker DTR.
 * Supports both custom Polygon perimeters and circular radius geofences (with graceful fallback).
 */

const EARTH_RADIUS_M = 6_371_000; // Earth's mean radius in meters

export type PolygonPoint = [number, number]; // [latitude, longitude]

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Returns the great-circle distance in metres between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Normalizes input polygon formats (array of [lat, lng] or array of {lat, lng})
 * into standard [lat, lng][] array.
 */
export function normalizePolygon(raw: any): PolygonPoint[] {
  if (!raw) return [];
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) {
    return data
      .map((pt): PolygonPoint | null => {
        if (Array.isArray(pt) && pt.length >= 2) {
          const lat = parseFloat(pt[0]);
          const lng = parseFloat(pt[1]);
          return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
        }
        if (pt && typeof pt === 'object' && ('lat' in pt || 'latitude' in pt)) {
          const lat = parseFloat(pt.lat ?? pt.latitude);
          const lng = parseFloat(pt.lng ?? pt.longitude ?? pt.lon);
          return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
        }
        return null;
      })
      .filter((pt): pt is PolygonPoint => pt !== null);
  }
  return [];
}

/**
 * Ray-casting algorithm to determine if a point (lat, lon) is inside a polygon.
 */
export function isPointInPolygon(
  lat: number,
  lon: number,
  polygon: PolygonPoint[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lonI] = polygon[i];
    const [latJ, lonJ] = polygon[j];

    const intersect =
      latI > lat !== latJ > lat &&
      lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes shortest distance in meters from a point to a polygon edge.
 */
export function distanceToPolygonMeters(
  lat: number,
  lon: number,
  polygon: PolygonPoint[]
): number {
  if (!polygon || polygon.length === 0) return 0;
  if (polygon.length === 1) {
    return haversineDistance(lat, lon, polygon[0][0], polygon[0][1]);
  }

  // Convert lat/lon to local meter coordinates relative to point
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos(toRad(lat));

  let minDistanceSq = Infinity;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x1 = (polygon[j][1] - lon) * mPerDegLon;
    const y1 = (polygon[j][0] - lat) * mPerDegLat;
    const x2 = (polygon[i][1] - lon) * mPerDegLon;
    const y2 = (polygon[i][0] - lat) * mPerDegLat;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLenSq = dx * dx + dy * dy;

    let t = segLenSq === 0 ? 0 : -(x1 * dx + y1 * dy) / segLenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const distSq = projX * projX + projY * projY;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
    }
  }

  return Math.round(Math.sqrt(minDistanceSq));
}

/**
 * Calculates the centroid (mean center) of a polygon.
 */
export function getPolygonCentroid(polygon: PolygonPoint[]): PolygonPoint | null {
  if (!polygon || polygon.length === 0) return null;
  let latSum = 0;
  let lonSum = 0;
  for (const [lat, lon] of polygon) {
    latSum += lat;
    lonSum += lon;
  }
  return [latSum / polygon.length, lonSum / polygon.length];
}

/**
 * Generates a rectangular bounding polygon around a center GPS point.
 * Useful for quick 1-click perimeter creation.
 */
export function generateBoxPolygon(
  centerLat: number,
  centerLon: number,
  sizeMeters = 150
): PolygonPoint[] {
  const half = sizeMeters / 2;
  const dLat = half / 111_320;
  const dLon = half / (111_320 * Math.cos(toRad(centerLat)));

  return [
    [centerLat + dLat, centerLon - dLon], // NW
    [centerLat + dLat, centerLon + dLon], // NE
    [centerLat - dLat, centerLon + dLon], // SE
    [centerLat - dLat, centerLon - dLon], // SW
  ];
}

export interface GeofenceResult {
  allowed: boolean;
  distance?: number; // in metres (distance from center or from polygon edge)
  radius?: number;   // configured circular radius in metres (if circular)
  mode: 'polygon' | 'circle' | 'none';
}

/**
 * Checks whether a student's position falls within a company's geofence.
 * Prioritizes custom polygon perimeter if defined (>= 3 points),
 * with graceful fallback to circular radius if polygon is not set.
 */
export function checkGeofence(
  studentLat: number,
  studentLon: number,
  companyLat: number | null,
  companyLon: number | null,
  radiusMeters: number = 200,
  geofencePolygon?: any
): GeofenceResult {
  const polygon = normalizePolygon(geofencePolygon);

  // If a polygon with 3 or more vertices is defined, use polygon geofencing
  if (polygon.length >= 3) {
    const inside = isPointInPolygon(studentLat, studentLon, polygon);
    if (inside) {
      return { allowed: true, mode: 'polygon' };
    }
    const dist = distanceToPolygonMeters(studentLat, studentLon, polygon);
    return { allowed: false, distance: dist, mode: 'polygon' };
  }

  // Graceful fallback: circular radius geofence
  if (companyLat != null && companyLon != null) {
    const distance = haversineDistance(studentLat, studentLon, companyLat, companyLon);
    return {
      allowed: distance <= radiusMeters,
      distance: Math.round(distance),
      radius: radiusMeters,
      mode: 'circle',
    };
  }

  // No geofence coordinates defined
  return { allowed: true, mode: 'none' };
}

/**
 * Wraps the browser Geolocation API in a promise.
 * Resolves with { latitude, longitude, accuracy } or rejects with an error message string.
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
      err => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject('Location permission was denied. Please enable it in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            reject('Location information is currently unavailable. Try again later.');
            break;
          case err.TIMEOUT:
            reject('Location request timed out. Try again.');
            break;
          default:
            reject('An unknown error occurred while retrieving your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  });
}
