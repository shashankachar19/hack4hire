// ============================================================================
// DispatchGrid — Utility Functions
// Geographic calculations, time helpers, etc.
// ============================================================================

/**
 * Haversine distance between two lat/lng points.
 * Returns distance in KILOMETERS.
 * 
 * Formula: a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
 *          c = 2 · atan2(√a, √(1−a))
 *          d = R · c
 * 
 * where R = 6371 km (Earth's mean radius)
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time in MINUTES between two locations.
 * Assumes average speed of 40 km/h for urban field service.
 * This is a deterministic estimate — no external API calls.
 */
export function estimateTravelTimeMinutes(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const distanceKm = haversineDistance(lat1, lng1, lat2, lng2);
  const AVERAGE_SPEED_KMH = 40;
  return (distanceKm / AVERAGE_SPEED_KMH) * 60; // Convert hours to minutes
}

/**
 * Parse a shift time string (HH:mm) into hours and minutes.
 */
export function parseShiftTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Get the shift start/end as Date objects for a given reference date.
 * Technician shifts are daily recurring — we anchor them to the job's date.
 */
export function getShiftBoundaries(
  shiftStart: string,
  shiftEnd: string,
  referenceDate: Date
): { shiftStartDate: Date; shiftEndDate: Date } {
  const start = parseShiftTime(shiftStart);
  const end = parseShiftTime(shiftEnd);
  
  const shiftStartDate = new Date(referenceDate);
  shiftStartDate.setHours(start.hours, start.minutes, 0, 0);
  
  const shiftEndDate = new Date(referenceDate);
  shiftEndDate.setHours(end.hours, end.minutes, 0, 0);
  
  // Handle overnight shifts (e.g., 22:00 - 06:00)
  if (shiftEndDate <= shiftStartDate) {
    shiftEndDate.setDate(shiftEndDate.getDate() + 1);
  }
  
  return { shiftStartDate, shiftEndDate };
}

/**
 * Check if two time ranges overlap.
 * Two ranges [s1, e1) and [s2, e2) overlap if s1 < e2 AND s2 < e1.
 */
export function timeRangesOverlap(
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Add minutes to a Date, returning a new Date.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Calculate minutes between two dates.
 */
export function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (60 * 1000);
}

/**
 * Format a Date for display.
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

