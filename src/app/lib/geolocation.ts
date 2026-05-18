/**
 * Haversine-based geolocation utilities for OJT Tracker DTR geofencing.
 */

const EARTH_RADIUS_M = 6_371_000; // Earth's mean radius in meters

function toRad(deg: number): number {
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

export interface GeofenceResult {
  allowed: boolean;
  distance: number; // in metres
  radius: number;   // configured radius in metres
}

/**
 * Checks whether a student's position falls within a company's geofence.
 * Returns { allowed, distance, radius }.
 */
export function checkGeofence(
  studentLat: number,
  studentLon: number,
  companyLat: number,
  companyLon: number,
  radiusMeters: number
): GeofenceResult {
  const distance = haversineDistance(studentLat, studentLon, companyLat, companyLon);
  return { allowed: distance <= radiusMeters, distance: Math.round(distance), radius: radiusMeters };
}

/**
 * Wraps the browser Geolocation API in a promise.
 * Resolves with { latitude, longitude } or rejects with an error message string.
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
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
