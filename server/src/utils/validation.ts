// ============================================================================
// DispatchGrid — Input Validation Schemas (Zod)
// Strict validation for all API inputs. Rejects bad data early with clear messages.
// ============================================================================

import { z } from 'zod';

// Time format: HH:mm (24-hour)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ============================================================================
// Customer Validation
// ============================================================================

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().min(5, 'Phone number is required').max(30),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required').max(500),
  age: z.number().int().min(16).max(120).default(25),
});

export const updateCustomerSchema = createCustomerSchema.partial();


export const createTechnicianSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  skills: z.array(z.string().min(1)).min(1, 'At least one skill is required'),
  serviceZones: z.array(z.string().min(1)).min(1, 'At least one service zone is required'),
  shiftStart: z.string().regex(timeRegex, 'Shift start must be in HH:mm format (e.g., "08:00")'),
  shiftEnd: z.string().regex(timeRegex, 'Shift end must be in HH:mm format (e.g., "17:00")'),
  latitude: z.number().min(-90).max(90).optional().default(0),
  longitude: z.number().min(-180).max(180).optional().default(0),
});

export const updateTechnicianSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  skills: z.array(z.string().min(1)).min(1).optional(),
  serviceZones: z.array(z.string().min(1)).min(1).optional(),
  shiftStart: z.string().regex(timeRegex).optional(),
  shiftEnd: z.string().regex(timeRegex).optional(),
  isAvailable: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// ============================================================================
// Job Validation
// ============================================================================

export const jobPriorityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const jobStatusEnum = z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNASSIGNED']);

export const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  customerId: z.string().optional().nullable(),
  priority: jobPriorityEnum.default('MEDIUM'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  requiredSkills: z.array(z.string().min(1)).min(1, 'At least one required skill must be specified'),
  serviceZone: z.string().min(1, 'Service zone is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  windowStart: z.string().datetime({ message: 'windowStart must be a valid ISO datetime' }),
  windowEnd: z.string().datetime({ message: 'windowEnd must be a valid ISO datetime' }),
  slaDeadline: z.string().datetime({ message: 'slaDeadline must be a valid ISO datetime' }),
}).refine(
  (data) => new Date(data.windowStart) < new Date(data.windowEnd),
  { message: 'windowStart must be before windowEnd', path: ['windowEnd'] }
).refine(
  (data) => new Date(data.windowEnd) <= new Date(data.slaDeadline),
  { message: 'windowEnd must be on or before slaDeadline', path: ['slaDeadline'] }
);

export const updateJobSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  priority: jobPriorityEnum.optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  requiredSkills: z.array(z.string().min(1)).min(1).optional(),
  serviceZone: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  slaDeadline: z.string().datetime().optional(),
});

export const updateJobStatusSchema = z.object({
  status: jobStatusEnum,
});

// ============================================================================
// Disruption Validation
// ============================================================================

export const techDropoutSchema = z.object({
  technicianId: z.string().uuid('Invalid technician ID').optional(),
  reason: z.string().max(500).optional(),
});

export const urgentJobSchema = createJobSchema;

export const durationExtensionSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  newDurationMinutes: z.number().int().min(1).max(480),
  reason: z.string().max(500).optional(),
});

export const earlyFinishSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  actualDurationMinutes: z.number().int().min(5).max(480).optional(),
  reason: z.string().max(500).optional(),
});


