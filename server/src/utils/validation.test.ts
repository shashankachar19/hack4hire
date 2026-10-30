// ============================================================================
// DispatchGrid — Unit Tests: Input Validation (Zod Schemas)
// Tests for: job creation validation, technician validation, edge cases
// ============================================================================

import {
  createJobSchema,
  createTechnicianSchema,
  updateJobStatusSchema,
  techDropoutSchema,
  durationExtensionSchema,
} from '../utils/validation';

describe('Job Creation Validation', () => {
  const validJob = {
    title: 'Fix pipe',
    priority: 'HIGH',
    durationMinutes: 60,
    requiredSkills: ['plumbing'],
    serviceZone: 'zone-north',
    latitude: 12.98,
    longitude: 77.58,
    windowStart: '2026-10-31T08:00:00Z',
    windowEnd: '2026-10-31T12:00:00Z',
    slaDeadline: '2026-10-31T14:00:00Z',
  };

  test('accepts valid job input', () => {
    const result = createJobSchema.parse(validJob);
    expect(result.title).toBe('Fix pipe');
    expect(result.priority).toBe('HIGH');
  });

  test('rejects empty title', () => {
    expect(() => createJobSchema.parse({ ...validJob, title: '' })).toThrow();
  });

  test('rejects negative duration', () => {
    expect(() => createJobSchema.parse({ ...validJob, durationMinutes: -1 })).toThrow();
  });

  test('rejects zero duration', () => {
    expect(() => createJobSchema.parse({ ...validJob, durationMinutes: 0 })).toThrow();
  });

  test('rejects duration > 480 minutes (8 hours)', () => {
    expect(() => createJobSchema.parse({ ...validJob, durationMinutes: 481 })).toThrow();
  });

  test('rejects empty requiredSkills array', () => {
    expect(() => createJobSchema.parse({ ...validJob, requiredSkills: [] })).toThrow();
  });

  test('rejects invalid priority', () => {
    expect(() => createJobSchema.parse({ ...validJob, priority: 'URGENT' })).toThrow();
  });

  test('rejects windowStart after windowEnd', () => {
    expect(() => createJobSchema.parse({
      ...validJob,
      windowStart: '2026-10-31T14:00:00Z',
      windowEnd: '2026-10-31T08:00:00Z',
    })).toThrow();
  });

  test('rejects windowEnd after slaDeadline', () => {
    expect(() => createJobSchema.parse({
      ...validJob,
      windowEnd: '2026-10-31T15:00:00Z',
      slaDeadline: '2026-10-31T14:00:00Z',
    })).toThrow();
  });

  test('rejects invalid latitude', () => {
    expect(() => createJobSchema.parse({ ...validJob, latitude: 91 })).toThrow();
    expect(() => createJobSchema.parse({ ...validJob, latitude: -91 })).toThrow();
  });

  test('rejects invalid datetime format', () => {
    expect(() => createJobSchema.parse({ ...validJob, windowStart: 'not-a-date' })).toThrow();
  });
});

describe('Technician Creation Validation', () => {
  const validTech = {
    name: 'John Doe',
    skills: ['plumbing', 'electrical'],
    serviceZones: ['zone-north'],
    shiftStart: '08:00',
    shiftEnd: '17:00',
  };

  test('accepts valid technician input', () => {
    const result = createTechnicianSchema.parse(validTech);
    expect(result.name).toBe('John Doe');
  });

  test('rejects empty name', () => {
    expect(() => createTechnicianSchema.parse({ ...validTech, name: '' })).toThrow();
  });

  test('rejects empty skills', () => {
    expect(() => createTechnicianSchema.parse({ ...validTech, skills: [] })).toThrow();
  });

  test('rejects invalid shift time format', () => {
    expect(() => createTechnicianSchema.parse({ ...validTech, shiftStart: '8am' })).toThrow();
    expect(() => createTechnicianSchema.parse({ ...validTech, shiftStart: '25:00' })).toThrow();
  });
});

describe('Job Status Transition Validation', () => {
  test('accepts valid statuses', () => {
    ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNASSIGNED'].forEach(s => {
      expect(updateJobStatusSchema.parse({ status: s }).status).toBe(s);
    });
  });

  test('rejects invalid status', () => {
    expect(() => updateJobStatusSchema.parse({ status: 'INVALID' })).toThrow();
    expect(() => updateJobStatusSchema.parse({ status: '' })).toThrow();
  });
});

describe('Disruption Validation', () => {
  test('tech dropout requires valid UUID', () => {
    expect(() => techDropoutSchema.parse({ technicianId: 'not-a-uuid' })).toThrow();
  });

  test('duration extension requires valid UUID and positive duration', () => {
    expect(() => durationExtensionSchema.parse({ jobId: 'not-a-uuid', newDurationMinutes: 60 })).toThrow();
  });

  test('duration extension rejects zero or negative duration', () => {
    const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(() => durationExtensionSchema.parse({ jobId: validUuid, newDurationMinutes: 0 })).toThrow();
    expect(() => durationExtensionSchema.parse({ jobId: validUuid, newDurationMinutes: -10 })).toThrow();
  });
});

