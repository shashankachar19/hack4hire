// ============================================================================
// DispatchGrid — Job Controller (Module A)
// REST controller for CRUD operations on jobs + state machine transitions.
//
// Endpoints:
//   POST   /              Create a new job (supports Idempotency-Key)
//   POST   /instant-match Create and auto-dispatch instantly (Uber/Zepto flow)
//   POST   /:id/decline   Technician declines assignment & reoptimizes to backup
//   GET    /              List jobs (with optional filters)
//   GET    /:id           Get a single job with assignment details + explanation
//   PATCH  /:id           Update job fields (only if status allows)
//   PATCH  /:id/state     Transition job state (STRICT state machine)
//
// State Machine (from types/index.ts VALID_JOB_TRANSITIONS):
//   PENDING    → ASSIGNED, CANCELLED
//   ASSIGNED   → IN_PROGRESS, UNASSIGNED, CANCELLED
//   IN_PROGRESS → COMPLETED, CANCELLED
//   COMPLETED  → (terminal)
//   CANCELLED  → (terminal)
//   UNASSIGNED → ASSIGNED, CANCELLED
//
// SQLite note: `requiredSkills` is stored as a JSON-encoded string.
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
} from '../utils/validation';
import { ApiResponse, VALID_JOB_TRANSITIONS, JobStatusType } from '../types';
import { AppError } from '../middleware/errorHandler';
import { reOptimizeSchedule } from '../services/schedulingService';
import { sendAssignmentEmail } from '../services/emailService';

const router = Router();

// ============================================================================
// Helper: Deserialize JSON-string fields from SQLite rows
// ============================================================================

function deserializeJob(job: any): any {
  return {
    ...job,
    requiredSkills: typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills) : job.requiredSkills,
  };
}

function deserializeTechInJob(assignment: any): any {
  if (assignment.technician) {
    return {
      ...assignment,
      technician: {
        ...assignment.technician,
        skills: typeof assignment.technician.skills === 'string' ? JSON.parse(assignment.technician.skills) : assignment.technician.skills,
        serviceZones: typeof assignment.technician.serviceZones === 'string' ? JSON.parse(assignment.technician.serviceZones) : assignment.technician.serviceZones,
      },
    };
  }
  return assignment;
}

// Helper: Ensure customer ID is valid in SQLite DB, or create/upsert from payload to prevent foreign key errors
async function resolveValidCustomerId(customerId?: string | null, description?: string | null): Promise<string | null> {
  if (customerId) {
    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (existing) return existing.id;
  }

  if (description) {
    try {
      const parsed = JSON.parse(description);
      if (parsed && (parsed.phone || parsed.email)) {
        let customer = null;
        if (parsed.phone) {
          customer = await prisma.customer.findUnique({ where: { phone: parsed.phone } });
        }
        if (!customer && parsed.email) {
          customer = await prisma.customer.findFirst({ where: { email: parsed.email } });
        }
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              ...(customerId ? { id: customerId } : {}),
              name: parsed.name || 'Customer',
              phone: parsed.phone || `+91 ${Date.now()}`,
              email: parsed.email || null,
              address: parsed.address || null,
              age: parsed.age ? Number(parsed.age) : 28,
            },
          });
        }
        return customer.id;
      }
    } catch {}
  }

  return null;
}

// ============================================================================
// POST / — Create a new job
// ============================================================================

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createJobSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // If an idempotency key is present, check DB first
    if (idempotencyKey) {
      const existingJob = await prisma.job.findFirst({
        where: { idempotencyKey },
      });
      if (existingJob) {
        const response: ApiResponse = {
          success: true,
          data: deserializeJob(existingJob),
        };
        res.status(201).json(response);
        return;
      }
    }

    const validCustomerId = await resolveValidCustomerId(data.customerId, data.description);

    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        customerId: validCustomerId,
        priority: data.priority,
        durationMinutes: data.durationMinutes,
        requiredSkills: JSON.stringify(data.requiredSkills),
        serviceZone: data.serviceZone,
        latitude: data.latitude,
        longitude: data.longitude,
        windowStart: new Date(data.windowStart),
        windowEnd: new Date(data.windowEnd),
        slaDeadline: new Date(data.slaDeadline),
        idempotencyKey: idempotencyKey || null,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: deserializeJob(job),
    };
    res.status(201).json(response);
  } catch (err: any) {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey && (err.code === 'P2002' || err.message?.includes('idempotencyKey') || err.message?.includes('Unique constraint'))) {
      const existingJob = await prisma.job.findFirst({
        where: { idempotencyKey },
      });
      if (existingJob) {
        res.status(201).json({
          success: true,
          data: deserializeJob(existingJob),
        });
        return;
      }
    }
    next(err);
  }
});

// ============================================================================
// POST /instant-match — On-Demand Booking with Immediate Auto-Dispatch
// Emulates Uber / Zepto / Rapido instant partner matching
// ============================================================================

router.post('/instant-match', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createJobSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // Detect active operational shift date from existing jobs
    const referenceJob = await prisma.job.findFirst({
      select: { windowStart: true },
      orderBy: { windowStart: 'asc' },
    });

    let windowStart = new Date(data.windowStart);
    let windowEnd = new Date(data.windowEnd);
    let slaDeadline = new Date(data.slaDeadline);

    if (referenceJob) {
      const opDate = new Date(referenceJob.windowStart);
      const isDifferentDay = windowStart.toDateString() !== opDate.toDateString();
      const reqHour = windowStart.getHours();
      const isOutsideShift = reqHour < 8 || reqHour >= 17;

      if (isDifferentDay || isOutsideShift) {
        windowStart = new Date(opDate);
        windowStart.setHours(9, 30, 0, 0);
        windowEnd = new Date(opDate);
        windowEnd.setHours(12, 30, 0, 0);
        slaDeadline = new Date(opDate);
        slaDeadline.setHours(14, 30, 0, 0);
      }
    }

    const validCustomerId = await resolveValidCustomerId(data.customerId, data.description);

    // 1. Create the job in PENDING state (bulletproof foreign key)
    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        customerId: validCustomerId,
        priority: data.priority,
        durationMinutes: data.durationMinutes,
        requiredSkills: JSON.stringify(data.requiredSkills),
        serviceZone: data.serviceZone,
        latitude: data.latitude,
        longitude: data.longitude,
        windowStart,
        windowEnd,
        slaDeadline,
        idempotencyKey: idempotencyKey || null,
        status: 'PENDING',
      },
    });

    const preferredId = (req.body as any).preferredTechId;

    // Fetch all available technicians, ordered with the newest (human-registered) first
    const allTechs = await prisma.technician.findMany({
      where: { isAvailable: true },
      orderBy: { createdAt: 'desc' },
    });

    // Qualified by trade skills and service operating zone
    const qualified = allTechs.filter((t: any) => {
      const skills: string[] = typeof t.skills === 'string' ? JSON.parse(t.skills) : t.skills;
      const zones: string[] = typeof t.serviceZones === 'string' ? JSON.parse(t.serviceZones) : t.serviceZones;
      const hasSkill = data.requiredSkills.every((s: string) => skills.includes(s));
      const hasZone = zones.includes(data.serviceZone);
      return hasSkill && hasZone;
    });

    // Determine target technician:
    // 1. Explicitly chosen preferred tech
    // 2. Newly registered / matching partner (Friend A on laptop 2)
    // 3. Any technician matching the trade skill
    // 4. Any online technician
    const preferredTech = preferredId ? allTechs.find((t: any) => t.id === preferredId) : null;
    const chosenTech =
      preferredTech ||
      qualified[0] ||
      allTechs.find((t: any) => {
        const skills: string[] = typeof t.skills === 'string' ? JSON.parse(t.skills) : t.skills;
        return data.requiredSkills.some((s: string) => skills.includes(s));
      }) ||
      allTechs[0];

    let freshJob: any = null;
    let rawAssignment: any = null;
    let isAssigned = false;
    let assignment: any = null;
    let reoptResult: any = null;

    if (chosenTech) {
      const schedStart = new Date(windowStart);
      const schedEnd = new Date(schedStart.getTime() + data.durationMinutes * 60 * 1000);

      rawAssignment = await prisma.assignment.create({
        data: {
          jobId: job.id,
          technicianId: chosenTech.id,
          scheduledStart: schedStart,
          scheduledEnd: schedEnd,
          travelTimeMin: 6.5,
          isLocked: true, // Guarantees this urgent on-demand dispatch won't be wiped/reassigned by solver!
          runId: `instant-dispatch-${Date.now()}`,
        },
        include: { technician: true },
      });

      freshJob = await prisma.job.update({
        where: { id: job.id },
        data: { status: 'ASSIGNED' },
      });

      isAssigned = true;
      assignment = deserializeTechInJob(rawAssignment);

      // Asynchronously trigger customer assignment confirmation email with Doorstep PIN
      const customerDossier = (() => {
        try {
          return data.description ? JSON.parse(data.description) : null;
        } catch {
          return null;
        }
      })();

      let recipientEmail = customerDossier?.email;
      if (!recipientEmail && validCustomerId) {
        prisma.customer
          .findUnique({ where: { id: validCustomerId }, select: { email: true } })
          .then((c) => {
            if (c?.email && chosenTech) {
              sendAssignmentEmail({
                to: c.email,
                customerName: customerDossier?.name || 'Valued Customer',
                techName: chosenTech.name,
                techPhone: customerDossier?.phone || '+91 98450 12345',
                jobTitle: job.title,
                serviceZone: job.serviceZone,
                pin: customerDossier?.servicePin || '4829',
              }).catch((e) => console.error('[ASSIGNMENT EMAIL ERROR]:', e.message));
            }
          })
          .catch(() => {});
      } else if (recipientEmail && chosenTech) {
        sendAssignmentEmail({
          to: recipientEmail,
          customerName: customerDossier?.name || 'Valued Customer',
          techName: chosenTech.name,
          techPhone: customerDossier?.phone || '+91 98450 12345',
          jobTitle: job.title,
          serviceZone: job.serviceZone,
          pin: customerDossier?.servicePin || '4829',
        }).catch((e) => console.error('[ASSIGNMENT EMAIL ERROR]:', e.message));
      }

      // Background optimization telemetry without disrupting this locked assignment
      try {
        reoptResult = await reOptimizeSchedule(`Instant customer booking: ${job.title}`);
      } catch {}
    } else {
      try {
        reoptResult = await reOptimizeSchedule(`Instant customer booking: ${job.title}`);
      } catch {}
      freshJob = await prisma.job.findUnique({ where: { id: job.id } });
      rawAssignment = await prisma.assignment.findFirst({
        where: { jobId: job.id },
        include: { technician: true },
      });
      isAssigned = !!rawAssignment && freshJob?.status === 'ASSIGNED';
      assignment = isAssigned ? deserializeTechInJob(rawAssignment) : null;
    }

    res.status(201).json({
      success: true,
      data: {
        job: deserializeJob(freshJob || job),
        assigned: isAssigned,
        assignment,
        metrics: reoptResult?.metrics || null,
      },
    });
  } catch (err: any) {
    next(err);
  }
});

// ============================================================================
// POST /:id/decline — Technician declines/drops a specific assignment
// ============================================================================

router.post('/:id/decline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `Job '${id}' not found`);
    }

    // Reset job to PENDING and delete assignment
    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({
        where: { jobId: id },
      });
      await tx.job.update({
        where: { id },
        data: { status: 'PENDING' },
      });
    });

    // Re-optimize pool so next best qualified technician is assigned
    const reoptResult = await reOptimizeSchedule(`Technician declined assignment for: ${job.title}`);
    const updatedAssignment = await prisma.assignment.findFirst({
      where: { jobId: id },
      include: { technician: true },
    });

    res.json({
      success: true,
      data: {
        reassigned: !!updatedAssignment,
        assignment: updatedAssignment ? deserializeTechInJob(updatedAssignment) : null,
        metrics: reoptResult.metrics,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET / — List all jobs with optional filters
// ============================================================================

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, zone } = req.query;

    const where: any = {};
    if (typeof status === 'string') where.status = status;
    if (typeof priority === 'string') where.priority = priority;
    if (typeof zone === 'string') where.serviceZone = zone;

    const jobs = await prisma.job.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { slaDeadline: 'asc' }],
      include: { customer: true },
    });

    const response: ApiResponse = {
      success: true,
      data: jobs.map(deserializeJob),
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /:id — Get a single job by ID with assignment details
// ============================================================================

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        assignments: {
          include: {
            technician: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `Job with ID '${id}' not found`);
    }

    const deserialized = deserializeJob(job);
    if (deserialized.assignments) {
      deserialized.assignments = deserialized.assignments.map(deserializeTechInJob);
    }

    // Module E: Retrieve individual job assignment and explanation
    const latestDetail = await prisma.runDetail.findFirst({
      where: { jobId: id },
      include: { run: true },
      orderBy: { id: 'desc' },
    });

    if (latestDetail) {
      deserialized.latestSchedulingDetail = {
        ...latestDetail,
        reasons: (() => {
          try {
            return JSON.parse(latestDetail.reasons);
          } catch {
            return [latestDetail.reasons];
          }
        })(),
      };
    } else {
      const assignment = job.assignments?.[0];
      deserialized.latestSchedulingDetail = {
        jobId: job.id,
        outcome: assignment ? 'ASSIGNED' : job.status,
        technicianId: assignment?.technicianId || null,
        scheduledStart: assignment?.scheduledStart || null,
        scheduledEnd: assignment?.scheduledEnd || null,
        explanation: assignment
          ? `Assigned to ${assignment.technician?.name || 'technician'} (${assignment.technicianId}) in ${job.serviceZone}`
          : `Job is currently ${job.status.toLowerCase()} awaiting next batch scheduling run.`,
        reasons: [assignment ? 'Matched skills and zone availability' : 'Queued for dispatch'],
      };
    }

    const response: ApiResponse = {
      success: true,
      data: deserialized,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PATCH /:id — Update job fields
// ============================================================================

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = updateJobSchema.parse(req.body);

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      throw new AppError(404, 'NOT_FOUND', `Job with ID '${id}' not found`);
    }

    if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(existingJob.status)) {
      throw new AppError(
        409,
        'JOB_LOCKED',
        `Cannot update job '${id}' because its status is '${existingJob.status}'`
      );
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.requiredSkills !== undefined) updateData.requiredSkills = JSON.stringify(data.requiredSkills);
    if (data.serviceZone !== undefined) updateData.serviceZone = data.serviceZone;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.windowStart !== undefined) updateData.windowStart = new Date(data.windowStart);
    if (data.windowEnd !== undefined) updateData.windowEnd = new Date(data.windowEnd);
    if (data.slaDeadline !== undefined) updateData.slaDeadline = new Date(data.slaDeadline);

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    const response: ApiResponse = { success: true, data: deserializeJob(job) };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PATCH /:id/state — Transition job state (STRICT state machine)
// ============================================================================

router.patch('/:id/state', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status: newStatus } = updateJobStatusSchema.parse(req.body);

    // Wrap in transaction for concurrency safety (Module G)
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id } });
      if (!job) {
        throw new AppError(404, 'NOT_FOUND', `Job with ID '${id}' not found`);
      }

      const currentStatus = job.status as JobStatusType;
      const allowedTransitions = VALID_JOB_TRANSITIONS[currentStatus];

      if (!allowedTransitions.includes(newStatus as JobStatusType)) {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          `Cannot transition job from '${currentStatus}' to '${newStatus}'. Allowed transitions from '${currentStatus}': [${allowedTransitions.join(', ')}]`,
          { currentStatus, requestedStatus: newStatus, allowedTransitions }
        );
      }

      const updatedJob = await tx.job.update({
        where: { id },
        data: { status: newStatus },
      });

      // When transitioning to IN_PROGRESS or COMPLETED, lock the assignment
      if (newStatus === 'IN_PROGRESS' || newStatus === 'COMPLETED') {
        await tx.assignment.updateMany({
          where: { jobId: id, isLocked: false },
          data: { isLocked: true },
        });
      }

      return updatedJob;
    });

    const response: ApiResponse = { success: true, data: deserializeJob(result) };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PATCH /:id/transit — Update transit stage, complication, and completion notes
// ============================================================================

router.patch('/:id/transit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      throw new AppError(404, 'NOT_FOUND', `Job with ID '${id}' not found`);
    }

    let parsedDesc: any = {};
    try {
      if (existingJob.description) {
        parsedDesc = JSON.parse(existingJob.description);
      }
    } catch {
      parsedDesc = { raw: existingJob.description };
    }

    const updatedDesc = {
      ...parsedDesc,
      ...req.body,
      transitUpdatedAt: new Date().toISOString(),
    };

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        description: JSON.stringify(updatedDesc),
      },
    });

    const response: ApiResponse = { success: true, data: deserializeJob(updatedJob) };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
