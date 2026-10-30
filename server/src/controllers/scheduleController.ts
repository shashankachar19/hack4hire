// ============================================================================
// DispatchGrid — Schedule Controller (Modules B/C/D/E)
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import { ApiResponse, COST_WEIGHTS, getJobEconomics, TRAVEL_COST_PER_MINUTE_INR, OVERTIME_COST_PER_30MIN_INR } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateSchedule, reOptimizeSchedule, forceAssignJobWithOvertime } from '../services/schedulingService';

const router = Router();

// POST /generate — Trigger schedule generation (supports custom weights)
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weights = req.body?.weights;
    const result = await generateSchedule(weights);
    res.status(201).json({ success: true, data: result } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /current — Get current schedule (assignments grouped by technician) + Financial Telemetry
router.get('/current', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const technicians = await prisma.technician.findMany({
      include: {
        assignments: {
          include: { job: true },
          orderBy: { scheduledStart: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const schedule = technicians.map((tech) => ({
      technician: {
        id: tech.id,
        name: tech.name,
        skills: JSON.parse(tech.skills),
        serviceZones: JSON.parse(tech.serviceZones),
        shiftStart: tech.shiftStart,
        shiftEnd: tech.shiftEnd,
        isAvailable: tech.isAvailable,
      },
      assignments: tech.assignments.map((a) => {
        const econ = getJobEconomics(a.job.priority);
        return {
          id: a.id,
          scheduledStart: a.scheduledStart,
          scheduledEnd: a.scheduledEnd,
          travelTimeMin: a.travelTimeMin,
          isLocked: a.isLocked,
          ticketValue: econ.ticketValue,
          slaPenaltyAmount: econ.slaPenaltyAmount,
          job: {
            id: a.job.id,
            title: a.job.title,
            priority: a.job.priority,
            status: a.job.status,
            serviceZone: a.job.serviceZone,
            requiredSkills: JSON.parse(a.job.requiredSkills),
            durationMinutes: a.job.durationMinutes,
            slaDeadline: a.job.slaDeadline,
            ticketValue: econ.ticketValue,
            slaPenaltyAmount: econ.slaPenaltyAmount,
          },
        };
      }),
      totalAssignments: tech.assignments.length,
      totalTravelTime: tech.assignments.reduce((sum, a) => sum + a.travelTimeMin, 0),
    }));

    // Also get unassigned/infeasible/impossible jobs
    const unassignedJobs = await prisma.job.findMany({
      where: { status: { in: ['UNASSIGNED', 'PENDING'] } },
    });

    // Get latest run details for explanations of unassigned jobs
    const latestRun = await prisma.scheduleRun.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    let unassignedExplanations: any[] = [];
    if (latestRun) {
      const details = await prisma.runDetail.findMany({
        where: { runId: latestRun.id, outcome: { in: ['INFEASIBLE', 'IMPOSSIBLE'] } },
      });
      unassignedExplanations = details.map(d => {
        const job = unassignedJobs.find(j => j.id === d.jobId);
        const priority = job ? job.priority : 'MEDIUM';
        const econ = getJobEconomics(priority);
        return {
          ...d,
          reasons: JSON.parse(d.reasons),
          recoveryTradeoff: d.outcome === 'INFEASIBLE' ? {
            overtimeMinutes: 30,
            overtimeCostINR: OVERTIME_COST_PER_30MIN_INR,
            penaltyAvoidedINR: econ.slaPenaltyAmount,
            ticketValueINR: econ.ticketValue,
            netBenefitINR: econ.ticketValue + econ.slaPenaltyAmount - OVERTIME_COST_PER_30MIN_INR,
            actionLabel: `Approve +30m Overtime (₹${OVERTIME_COST_PER_30MIN_INR}) to save ₹${econ.slaPenaltyAmount.toLocaleString('en-IN')} Penalty`,
          } : null,
        };
      });
    }

    // --- LIVE FINANCIAL TELEMETRY CALCULATIONS (INR ₹) ---
    const allAssignments = schedule.flatMap(s => s.assignments);
    const totalAssignments = allAssignments.length;
    const totalTravelTime = schedule.reduce((sum, s) => sum + s.totalTravelTime, 0);

    const totalScheduledRevenue = allAssignments.reduce((sum, a) => sum + a.ticketValue, 0);
    const slaPenaltiesAvoided = allAssignments.reduce((sum, a) => sum + a.slaPenaltyAmount, 0);
    const estimatedTravelCost = Math.round(totalTravelTime * TRAVEL_COST_PER_MINUTE_INR);
    const estimatedLaborCost = totalAssignments * 250; // Base labor dispatch cost
    const netProfit = Math.max(0, totalScheduledRevenue - estimatedTravelCost - estimatedLaborCost);
    const netMarginPercentage = totalScheduledRevenue > 0
      ? Math.round((netProfit / totalScheduledRevenue) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        schedule,
        unassignedJobs: unassignedJobs.map((j: any) => {
          const econ = getJobEconomics(j.priority);
          return {
            ...j,
            requiredSkills: JSON.parse(j.requiredSkills),
            ticketValue: econ.ticketValue,
            slaPenaltyAmount: econ.slaPenaltyAmount,
          };
        }),
        unassignedExplanations,
        summary: {
          totalTechnicians: schedule.length,
          availableTechnicians: schedule.filter(s => s.technician.isAvailable).length,
          totalAssignments,
          totalTravelTime,
          unassignedJobCount: unassignedJobs.length,
          // Financial Telemetry
          totalScheduledRevenue,
          slaPenaltiesAvoided,
          estimatedTravelCost,
          estimatedLaborCost,
          netProfit,
          netMarginPercentage,
          activeWeights: COST_WEIGHTS,
        },
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /re-optimize & /reoptimize — Trigger re-optimization (supports custom weights)
const handleReOptimize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = (req.body?.reason as string) || 'Manual re-optimization triggered';
    const weights = req.body?.weights;
    const result = await reOptimizeSchedule(reason, weights);
    res.json({ success: true, data: result } as ApiResponse);
  } catch (err) { next(err); }
};
router.post('/re-optimize', handleReOptimize);
router.post('/reoptimize', handleReOptimize);

// POST /force-assign — 1-click Actionable Business Recovery for Infeasible jobs
router.post('/force-assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, approvedOvertimeMinutes } = req.body || {};
    if (!jobId) {
      throw new AppError(400, 'BAD_REQUEST', 'jobId is required for force assignment');
    }
    const result = await forceAssignJobWithOvertime(jobId, approvedOvertimeMinutes || 30);
    res.json({ success: true, data: result } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /runs — List all schedule runs
router.get('/runs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await prisma.scheduleRun.findMany({ orderBy: { timestamp: 'desc' } });
    res.json({ success: true, data: runs } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /runs/:runId — Get a specific run with all details
router.get('/runs/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const run = await prisma.scheduleRun.findUnique({
      where: { id: runId },
      include: { details: true },
    });
    if (!run) {
      throw new AppError(404, 'NOT_FOUND', `Schedule run with ID '${runId}' not found`);
    }
    const details = ((run as any).details || []).map((d: any) => ({
      ...d,
      reasons: JSON.parse(d.reasons),
    }));
    res.json({ success: true, data: { ...run, details } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
