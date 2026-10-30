// ============================================================================
// DispatchGrid — Unit Tests: Geo Utilities
// Tests for: Haversine distance, travel time estimation, time helpers
// ============================================================================

import {
  haversineDistance,
  estimateTravelTimeMinutes,
  parseShiftTime,
  getShiftBoundaries,
  timeRangesOverlap,
  addMinutes,
  minutesBetween,
} from '../utils/geo';

describe('Haversine Distance', () => {
  test('distance between same point is 0', () => {
    expect(haversineDistance(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  test('distance between two Bangalore points is reasonable', () => {
    // Approx 5-6 km between these points
    const dist = haversineDistance(12.97, 77.59, 12.92, 77.58);
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(7);
  });

  test('distance is symmetric', () => {
    const d1 = haversineDistance(12.97, 77.59, 12.92, 77.58);
    const d2 = haversineDistance(12.92, 77.58, 12.97, 77.59);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });
});

describe('Travel Time Estimation', () => {
  test('travel time is 0 for same location', () => {
    expect(estimateTravelTimeMinutes(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  test('travel time is proportional to distance (40 km/h)', () => {
    // ~5.6km at 40km/h = ~8.4 minutes
    const time = estimateTravelTimeMinutes(12.97, 77.59, 12.92, 77.58);
    expect(time).toBeGreaterThan(5);
    expect(time).toBeLessThan(15);
  });
});

describe('Shift Time Parsing', () => {
  test('parses HH:mm correctly', () => {
    expect(parseShiftTime('08:00')).toEqual({ hours: 8, minutes: 0 });
    expect(parseShiftTime('17:30')).toEqual({ hours: 17, minutes: 30 });
    expect(parseShiftTime('00:00')).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('Shift Boundaries', () => {
  test('creates correct shift boundary dates', () => {
    const ref = new Date('2026-10-31T10:00:00Z');
    const { shiftStartDate, shiftEndDate } = getShiftBoundaries('08:00', '17:00', ref);

    expect(shiftStartDate.getHours()).toBe(8);
    expect(shiftStartDate.getMinutes()).toBe(0);
    expect(shiftEndDate.getHours()).toBe(17);
    expect(shiftEndDate.getMinutes()).toBe(0);
  });
});

describe('Time Range Overlap', () => {
  const base = new Date('2026-10-31T00:00:00Z');

  test('non-overlapping ranges return false', () => {
    const s1 = new Date(base.getTime() + 8 * 3600000); // 08:00
    const e1 = new Date(base.getTime() + 9 * 3600000); // 09:00
    const s2 = new Date(base.getTime() + 10 * 3600000); // 10:00
    const e2 = new Date(base.getTime() + 11 * 3600000); // 11:00
    expect(timeRangesOverlap(s1, e1, s2, e2)).toBe(false);
  });

  test('overlapping ranges return true', () => {
    const s1 = new Date(base.getTime() + 8 * 3600000);
    const e1 = new Date(base.getTime() + 10 * 3600000);
    const s2 = new Date(base.getTime() + 9 * 3600000);
    const e2 = new Date(base.getTime() + 11 * 3600000);
    expect(timeRangesOverlap(s1, e1, s2, e2)).toBe(true);
  });

  test('adjacent ranges (touching) do not overlap', () => {
    const s1 = new Date(base.getTime() + 8 * 3600000);
    const e1 = new Date(base.getTime() + 9 * 3600000);
    const s2 = new Date(base.getTime() + 9 * 3600000); // Starts exactly when first ends
    const e2 = new Date(base.getTime() + 10 * 3600000);
    expect(timeRangesOverlap(s1, e1, s2, e2)).toBe(false);
  });

  test('contained range returns true', () => {
    const s1 = new Date(base.getTime() + 8 * 3600000);
    const e1 = new Date(base.getTime() + 12 * 3600000);
    const s2 = new Date(base.getTime() + 9 * 3600000);
    const e2 = new Date(base.getTime() + 11 * 3600000);
    expect(timeRangesOverlap(s1, e1, s2, e2)).toBe(true);
  });
});

describe('Time Helpers', () => {
  test('addMinutes adds correct duration', () => {
    const start = new Date('2026-10-31T08:00:00Z');
    const result = addMinutes(start, 90);
    expect(result.toISOString()).toBe('2026-10-31T09:30:00.000Z');
  });

  test('minutesBetween returns correct duration', () => {
    const start = new Date('2026-10-31T08:00:00Z');
    const end = new Date('2026-10-31T09:30:00Z');
    expect(minutesBetween(start, end)).toBe(90);
  });
});

