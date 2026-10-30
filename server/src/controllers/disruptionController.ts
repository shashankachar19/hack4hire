// ============================================================================
// DispatchGrid — Disruption Controller (Module D)
// Handles real-time disruptions that require schedule re-optimization.
//
// Disruption types:
//   1. Tech Dropout  — A technician becomes unavailable (sick, vehicle breakdown)
//   2. Urgent Job    — A new high-priority job must be squeezed in immediately
//   3. Duration Ext  — A job takes longer than originally estimated
//
// Each disruption endpoint:
//   1. Applies the disruption (updates the affected entity)
//   2. Triggers re-optimization via the scheduling service
//   3. Returns the new schedule with explanations of what changed
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import {
  techDropoutSchema,
  urgentJobSchema,
  durationExtensionSchema,
  earlyFinishSchema,
} from '../utils/validation';
import { ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { reOptimizeSchedule } from '../services/schedulingService';

const router = Router();

// ============================================================================
// POST /tech-dropout — Mark a technician as unavailable
// This triggers re-optimization to reassign their pending/assigned jobs.
// Locked (in-progress) jobs are flagged but cannot be automatically reassigned.
// ============================================================================

router.post('/tech-dropout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = techDropoutSchema.parse(req.body);
    let targetTechId = data.technicianId;
    let technician: any;

    if (targetTechId) {
      technician = await prisma.technician.findUnique({
        where: { id: targetTechId },
      });

      if (!technician) {
        throw new AppError(
          404,
          'NOT_FOUND',
          `Technician with ID '${targetTechId}' not found`
        );
      }

      if (!technician.isAvailable) {
        throw new AppError(
          409,
          'ALREADY_UNAVAILABLE',
          `Technician '${technician.name}' is already marked as unavailable`
        );
      }
    } else {
      // Find an available technician who has >= 1 assigned unlocked job (pick one with most jobs)
      const availableTechs = await prisma.technician.findMany({
        where: { isAvailable: true },
        include: {
          assignments: {
            where: { isLocked: false },
          },
        },
      });

      const techWithJobs = availableTechs
        .filter((t) => t.assignments.length > 0)
        .sort((a, b) => b.assignments.length - a.assignments.length)[0];

      if (techWithJobs) {
        technician = techWithJobs;
        targetTechId = techWithJobs.id;
      } else {
        const anyAvailable = await prisma.technician.findFirst({
          where: { isAvailable: true },
        });
        if (!anyAvailable) {
          throw new AppError(
            409,
            'NO_AVAILABLE_TECH',
            'No available technicians found to dropout'
          );
        }
        technician = anyAvailable;
        targetTechId = anyAvailable.id;
      }
    }

    // ---- Apply the disruption inside a transaction ----
    await prisma.$transaction(async (tx) => {
      // Mark the technician as unavailable
      await tx.technician.update({
        where: { id: targetTechId },
        data: { isAvailable: false },
      });

      // Find all non-locked assignments for this technician
      // and set their jobs back to UNASSIGNED so the re-optimizer can reassign them
      const activeAssignments = await tx.assignment.findMany({
        where: {
          technicianId: targetTechId,
          isLocked: false,
        },
      });

      // Set each affected job to UNASSIGNED status
      for (const assignment of activeAssignments) {
        await tx.job.update({
          where: { id: assignment.jobId },
          data: { status: 'UNASSIGNED' },
        });
      }

      // Delete the non-locked assignments (they'll be recreated by re-optimizer)
      await tx.assignment.deleteMany({
        where: {
          technicianId: targetTechId,
          isLocked: false,
        },
      });
    });

    // ---- Trigger re-optimization ----
    const reason = `Technician dropout: ${technician.name}${data.reason ? ` — ${data.reason}` : ''}`;
    const result = await reOptimizeSchedule(reason);

    const response: ApiResponse = {
      success: true,
      data: {
        disruption: {
          type: 'TECH_DROPOUT',
          technicianId: targetTechId,
          technicianName: technician.name,
          reason: data.reason,
        },
        scheduleResult: result,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /urgent-job — Add a new urgent job and trigger re-optimization
// Creates the job with CRITICAL priority (overridden) and immediately
// runs the re-optimizer to find the best slot for it.
// ============================================================================

router.post('/urgent-job', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = urgentJobSchema.parse(req.body);

    // Create the job with CRITICAL priority (urgent jobs are always critical)
    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        priority: 'CRITICAL', // Override: urgent jobs are always CRITICAL
        durationMinutes: data.durationMinutes,
        requiredSkills: JSON.stringify(data.requiredSkills),
        serviceZone: data.serviceZone,
        latitude: data.latitude,
        longitude: data.longitude,
        windowStart: new Date(data.windowStart),
        windowEnd: new Date(data.windowEnd),
        slaDeadline: new Date(data.slaDeadline),
        status: 'PENDING',
      },
    });

    // Trigger re-optimization to fit the urgent job in
    const reason = `Urgent job added: ${job.title} (ID: ${job.id})`;
    const result = await reOptimizeSchedule(reason);

    const response: ApiResponse = {
      success: true,
      data: {
        disruption: {
          type: 'URGENT_JOB',
          jobId: job.id,
          jobTitle: job.title,
        },
        job: {
          ...job,
          requiredSkills: JSON.parse(job.requiredSkills),
        },
        scheduleResult: result,
      },
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /extend-duration — Extend a job's duration and trigger re-optimization
// When a field job takes longer than expected, this updates the duration
// and re-optimizes the schedule to handle the ripple effect on subsequent jobs.
// ============================================================================

router.post('/extend-duration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = durationExtensionSchema.parse(req.body);

    // ---- Validate the job exists and is in a modifiable state ----
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });

    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `Job with ID '${data.jobId}' not found`);
    }

    // Duration can be extended for ASSIGNED or IN_PROGRESS jobs
    if (!['ASSIGNED', 'IN_PROGRESS'].includes(job.status)) {
      throw new AppError(
        409,
        'INVALID_STATE',
        `Cannot extend duration for job in '${job.status}' status. ` +
          `Only ASSIGNED or IN_PROGRESS jobs can have their duration extended.`
      );
    }

    if (data.newDurationMinutes <= job.durationMinutes) {
      throw new AppError(
        400,
        'INVALID_DURATION',
        `New duration (${data.newDurationMinutes} min) must be greater than ` +
          `current duration (${job.durationMinutes} min)`
      );
    }

    // ---- Apply the duration change ----
    await prisma.job.update({
      where: { id: data.jobId },
      data: { durationMinutes: data.newDurationMinutes },
    });

    // ---- Trigger re-optimization ----
    const reason =
      `Duration extended for job '${job.title}': ` +
      `${job.durationMinutes} → ${data.newDurationMinutes} min` +
      (data.reason ? ` — ${data.reason}` : '');
    const result = await reOptimizeSchedule(reason);

    const response: ApiResponse = {
      success: true,
      data: {
        disruption: {
          type: 'DURATION_EXTENSION',
          jobId: data.jobId,
          jobTitle: job.title,
          oldDuration: job.durationMinutes,
          newDuration: data.newDurationMinutes,
          reason: data.reason,
        },
        scheduleResult: result,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POST /early-finish — A technician finishes a job earlier than scheduled
// Updates the job status to COMPLETED, locks its assignment, shrinks its duration,
// and re-optimizes the schedule to pull in pending/infeasible jobs into the freed gap.
// ============================================================================

router.post('/early-finish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = earlyFinishSchema.parse(req.body);
    const job = await prisma.job.findUnique({
      where: { id: data.jobId },
      include: { assignments: true },
    });

    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `Job with ID '${data.jobId}' not found`);
    }

    if (!['ASSIGNED', 'IN_PROGRESS'].includes(job.status)) {
      throw new AppError(
        409,
        'INVALID_STATE',
        `Cannot early-finish job in '${job.status}' status. Only ASSIGNED or IN_PROGRESS jobs can be finished.`
      );
    }

    const assignment = job.assignments[0];
    const originalDuration = job.durationMinutes;
    const newDuration = data.actualDurationMinutes || Math.max(15, Math.floor(originalDuration / 2));

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: data.jobId },
        data: {
          status: 'COMPLETED',
          durationMinutes: newDuration,
        },
      });

      if (assignment) {
        const newEnd = new Date(new Date(assignment.scheduledStart).getTime() + newDuration * 60 * 1000);
        await tx.assignment.update({
          where: { id: assignment.id },
          data: {
            scheduledEnd: newEnd,
            isLocked: true,
          },
        });
      }
    });

    const reason = `Early job finish: '${job.title}' completed in ${newDuration} min (saved ${originalDuration - newDuration} min). Released capacity re-optimized.`;
    const result = await reOptimizeSchedule(reason);

    const response: ApiResponse = {
      success: true,
      data: {
        disruption: {
          type: 'EARLY_FINISH',
          jobId: data.jobId,
          jobTitle: job.title,
          oldDuration: originalDuration,
          newDuration: newDuration,
          savedMinutes: originalDuration - newDuration,
          reason: data.reason,
        },
        scheduleResult: result,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
