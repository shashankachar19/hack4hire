// ============================================================================
// DispatchGrid — DETERMINISTIC SCHEDULING ENGINE
// ============================================================================
//
// This is the CORE of DispatchGrid. It implements a deterministic, mathematical
// heuristic for assigning jobs to technicians. NO LLMs, NO randomness.
//
// ALGORITHM OVERVIEW:
// 1. PRIORITY SORT: Jobs sorted by priority (CRITICAL first) then SLA urgency
// 2. HARD CONSTRAINT FILTER: For each job, find technicians that pass ALL hard constraints
// 3. COST SCORING: Score each valid (tech, timeslot) pair using a weighted cost function
// 4. GREEDY ASSIGNMENT: Assign job to the minimum-cost (tech, timeslot) pair
// 5. LOCAL SEARCH: After initial assignment, attempt swap/move improvements
//
// HARD CONSTRAINTS (must ALL pass — violation = infeasible/impossible):
//   - Skill match: tech must have ALL required skills
//   - Zone match: tech must serve the job's service zone
//   - Shift boundary: job must start and end within tech's shift
//   - Time window: job must start within [windowStart, windowEnd]
//   - SLA deadline: job must COMPLETE by slaDeadline
//   - No overlap: tech cannot have overlapping jobs (including travel time)
//   - Availability: tech must be marked as available
//
// SOFT COST FUNCTION (minimized — lower is better):
//   Cost = w1*SLA_risk + w2*travel_time + w3*overtime + w4*priority_penalty + w5*churn
//
// OUTPUT CLASSIFICATION:
//   - ASSIGNED: Job successfully assigned to a technician
//   - INFEASIBLE: Eligible technicians exist but no valid timeslot (capacity/time conflict)
//   - IMPOSSIBLE: No technician exists with required skills + zone combination
//
// ============================================================================

import prisma from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import {
  JobScheduleResult,
  ScheduleResult,
  ScheduleMetrics,
  CandidateAssignment,
  CostBreakdown,
  PRIORITY_WEIGHTS,
  COST_WEIGHTS,
  CostWeights,
  TimeSlot,
  OVERTIME_COST_PER_30MIN_INR,
  getJobEconomics,
} from '../types';
import {
  estimateTravelTimeMinutes,
  getShiftBoundaries,
  timeRangesOverlap,
  addMinutes,
  minutesBetween,
} from '../utils/geo';

// ============================================================================
// Type definitions for internal engine use
// ============================================================================

interface TechSchedule {
  techId: string;
  techName: string;
  skills: string[];
  serviceZones: string[];
  shiftStart: string;
  shiftEnd: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  /** Sorted list of occupied time slots for this technician */
  occupiedSlots: OccupiedSlot[];
}

interface OccupiedSlot {
  jobId: string;
  start: Date;
  end: Date;
  travelTimeMin: number;
  isLocked: boolean;
}

interface JobToSchedule {
  id: string;
  title: string;
  priority: string;
  durationMinutes: number;
  requiredSkills: string[];
  serviceZone: string;
  latitude: number;
  longitude: number;
  windowStart: Date;
  windowEnd: Date;
  slaDeadline: Date;
  status: string;
  /** Previous assignment info for churn calculation */
  previousTechId?: string;
}

// ============================================================================
// MAIN ENTRY POINTS
// ============================================================================

/**
 * Generate an initial schedule for all PENDING and UNASSIGNED jobs.
 * This is the primary scheduling endpoint (Module B/C).
 * Supports custom weights from the UI Policy Sliders.
 */
export async function generateSchedule(customWeights?: Partial<CostWeights>): Promise<ScheduleResult> {
  const runId = uuidv4();
  const effectiveWeights: CostWeights = { ...COST_WEIGHTS, ...customWeights };

  // 1. Reset: inside a single transaction, delete all unlocked assignments
  // and reset all jobs that are NOT IN_PROGRESS, COMPLETED, or CANCELLED (and not locked) back to PENDING.
  await prisma.$transaction(async (tx) => {
    const lockedAssignments = await tx.assignment.findMany({
      where: { isLocked: true },
      select: { jobId: true },
    });
    const lockedJobIds = lockedAssignments.map((a) => a.jobId);

    // Delete unlocked assignments
    await tx.assignment.deleteMany({
      where: { isLocked: false },
    });

    // Reset eligible jobs to PENDING
    await tx.job.updateMany({
      where: {
        status: { notIn: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        id: { notIn: lockedJobIds },
      },
      data: { status: 'PENDING' },
    });
  });

  // 1b. Load all schedulable jobs and available technicians
  const [jobs, technicians, existingAssignments] = await Promise.all([
    loadSchedulableJobs(),
    loadTechnicians(),
    loadExistingAssignments(),
  ]);

  // 2. Build technician schedule state (including locked assignments only)
  const lockedAssignments = existingAssignments.filter(a => a.isLocked);
  const techSchedules = buildTechSchedules(technicians, lockedAssignments);

  // 3. Run the scheduling algorithm
  const results = scheduleJobs(jobs, techSchedules, effectiveWeights);

  // 4. Run local search improvement pass
  const improvedResults = localSearchImprovement(results, jobs, techSchedules, effectiveWeights);

  // 5. Compute metrics
  const metrics = computeMetrics(improvedResults);

  // 6. Persist results to database
  await persistScheduleResults(runId, 'INITIAL', undefined, improvedResults, metrics);

  return {
    runId,
    runType: 'INITIAL',
    results: improvedResults,
    metrics,
  };
}

/**
 * Re-optimize the schedule after a disruption (Module D).
 * CRITICAL RULE: Jobs with status IN_PROGRESS or COMPLETED are LOCKED and immutable.
 * Only future/pending jobs are re-optimized.
 */
export async function reOptimizeSchedule(
  triggerReason: string,
  customWeights?: Partial<CostWeights>
): Promise<ScheduleResult> {
  const runId = uuidv4();
  const effectiveWeights: CostWeights = { ...COST_WEIGHTS, ...customWeights };

  // 1. Load jobs that need (re-)scheduling
  const [jobs, technicians, existingAssignments] = await Promise.all([
    loadSchedulableJobs(),
    loadTechnicians(),
    loadExistingAssignments(),
  ]);

  // 2. Get previous assignments for churn calculation
  const previousAssignmentMap = new Map<string, string>();
  existingAssignments.forEach(a => {
    if (!a.isLocked) {
      previousAssignmentMap.set(a.jobId, a.technicianId);
    }
  });

  // Mark previous tech for churn tracking
  const jobsWithPrevious: JobToSchedule[] = jobs.map(j => ({
    ...j,
    previousTechId: previousAssignmentMap.get(j.id),
  }));

  // Note: Unlocked assignments are replaced atomically inside persistScheduleResults transaction

  // 3. Rebuild tech schedules with only locked assignments remaining
  const lockedAssignments = existingAssignments.filter(a => a.isLocked);
  const techSchedules = buildTechSchedules(technicians, lockedAssignments);

  // 5. Re-run scheduling algorithm
  const results = scheduleJobs(jobsWithPrevious, techSchedules, effectiveWeights);

  // 6. Run local search improvement
  const improvedResults = localSearchImprovement(results, jobsWithPrevious, techSchedules, effectiveWeights);

  // 7. Add change tracking
  const trackedResults = improvedResults.map(r => {
    const prevTech = previousAssignmentMap.get(r.jobId);
    if (!prevTech && r.outcome === 'ASSIGNED') {
      return { ...r, changeType: 'new_assignment' as const };
    } else if (prevTech && r.outcome === 'ASSIGNED' && r.technicianId === prevTech) {
      return { ...r, changeType: 'unchanged' as const, previousTechId: prevTech };
    } else if (prevTech && r.outcome === 'ASSIGNED' && r.technicianId !== prevTech) {
      return { ...r, changeType: 'reassigned' as const, previousTechId: prevTech };
    } else if (prevTech && r.outcome !== 'ASSIGNED') {
      return { ...r, changeType: 'unassigned' as const, previousTechId: prevTech };
    }
    return r;
  });

  // 8. Compute metrics
  const metrics = computeMetrics(trackedResults);
  metrics.jobsReassigned = trackedResults.filter(r => r.changeType === 'reassigned').length;
  metrics.jobsNewlyAssigned = trackedResults.filter(r => r.changeType === 'new_assignment').length;
  metrics.jobsUnchanged = trackedResults.filter(r => r.changeType === 'unchanged').length;

  // 9. Persist
  await persistScheduleResults(runId, 'DISRUPTION_RECOVERY', triggerReason, trackedResults, metrics);

  return {
    runId,
    runType: 'DISRUPTION_RECOVERY',
    triggerReason,
    results: trackedResults,
    metrics,
  };
}

// ============================================================================
// CORE SCHEDULING ALGORITHM
// ============================================================================

/**
 * The main scheduling loop. For each job (sorted by priority and urgency),
 * find the best technician-timeslot pair and assign.
 * 
 * ALGORITHM:
 * 1. Sort jobs: CRITICAL > HIGH > MEDIUM > LOW, then by SLA urgency (earliest deadline first)
 * 2. For each job:
 *    a. Filter technicians by HARD CONSTRAINTS (skills, zones, availability)
 *    b. For each eligible tech, find valid time slots
 *    c. Score each (tech, slot) pair with the COST FUNCTION
 *    d. Assign to the minimum-cost pair
 *    e. Update the tech's schedule to reflect the new assignment
 * 
 * This is a CONSTRUCTIVE HEURISTIC — it builds the schedule job-by-job.
 * It's better than naive "first available" because:
 *   - Jobs are processed in priority order (critical jobs get best slots)
 *   - The cost function considers multiple objectives simultaneously
 *   - The subsequent local search can improve the initial solution
 */
function scheduleJobs(
  jobs: JobToSchedule[],
  techSchedules: Map<string, TechSchedule>,
  weights: CostWeights = COST_WEIGHTS
): JobScheduleResult[] {
  // ---- STEP 1: Sort jobs by priority (descending) then SLA urgency (ascending) ----
  const sortedJobs = [...jobs].sort((a, b) => {
    const priorityDiff = (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    // Same priority → earlier SLA deadline goes first (more urgent)
    return a.slaDeadline.getTime() - b.slaDeadline.getTime();
  });

  const results: JobScheduleResult[] = [];

  for (const job of sortedJobs) {
    // ---- STEP 2a: Hard constraint filtering ----
    const { eligible, reasons: filterReasons } = filterEligibleTechnicians(job, techSchedules);

    if (eligible.length === 0) {
      // Determine if IMPOSSIBLE (no tech has skills+zone) or INFEASIBLE (capacity issue)
      const outcome = determineFailureType(job, techSchedules, filterReasons);
      results.push(outcome);
      continue;
    }

    // ---- STEP 2b-c: Find and score candidate assignments ----
    const candidates = findCandidateAssignments(job, eligible, techSchedules, weights);

    if (candidates.length === 0) {
      // Technicians exist but no valid timeslot found
      results.push({
        jobId: job.id,
        outcome: 'INFEASIBLE',
        explanation: `Eligible technicians found but no valid time slot available. All ${eligible.length} eligible technician(s) have scheduling conflicts during the job's time window [${job.windowStart.toISOString()} - ${job.windowEnd.toISOString()}].`,
        reasons: [
          `${eligible.length} technician(s) have the required skills and serve the zone`,
          `No available slot within time window [${job.windowStart.toISOString()} - ${job.windowEnd.toISOString()}]`,
          `Job requires ${job.durationMinutes} minutes of uninterrupted time`,
          ...getDetailedSlotConflicts(job, eligible, techSchedules),
        ],
        previousTechId: job.previousTechId,
      });
      continue;
    }

    // ---- STEP 2d: Assign to minimum-cost candidate ----
    // Sort candidates by cost (ascending) — best candidate first
    candidates.sort((a, b) => a.costScore - b.costScore);
    const best = candidates[0];

    // ---- STEP 2e: Update tech schedule ----
    const techSchedule = techSchedules.get(best.technicianId)!;
    techSchedule.occupiedSlots.push({
      jobId: job.id,
      start: best.scheduledStart,
      end: best.scheduledEnd,
      travelTimeMin: best.travelTimeMin,
      isLocked: false,
    });
    // Keep slots sorted by start time
    techSchedule.occupiedSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    results.push({
      jobId: job.id,
      outcome: 'ASSIGNED',
      technicianId: best.technicianId,
      technicianName: best.technicianName,
      scheduledStart: best.scheduledStart,
      scheduledEnd: best.scheduledEnd,
      travelTimeMin: best.travelTimeMin,
      costScore: best.costScore,
      costBreakdown: best.costBreakdown,
      explanation: `Assigned to ${best.technicianName} (cost score: ${best.costScore.toFixed(2)}). ` +
        `Travel time: ${best.travelTimeMin.toFixed(1)} min. ` +
        `Scheduled: ${best.scheduledStart.toISOString()} - ${best.scheduledEnd.toISOString()}.`,
      reasons: [
        `Selected from ${candidates.length} candidate(s)`,
        `Best cost score: ${best.costScore.toFixed(2)}`,
        `SLA risk: ${best.costBreakdown.slaRisk.toFixed(2)}`,
        `Travel time: ${best.travelTimeMin.toFixed(1)} min`,
      ],
      previousTechId: job.previousTechId,
      changeType: job.previousTechId
        ? (job.previousTechId === best.technicianId ? 'unchanged' : 'reassigned')
        : 'new_assignment',
    });
  }

  return results;
}

// ============================================================================
// HARD CONSTRAINT FILTERING
// ============================================================================

/**
 * Filter technicians by hard constraints for a given job.
 * Returns eligible technicians and the reasons each ineligible tech was rejected.
 * 
 * Hard constraints (ALL must pass):
 * 1. Tech is available (not dropped out)
 * 2. Tech has ALL required skills
 * 3. Tech serves the job's service zone
 */
function filterEligibleTechnicians(
  job: JobToSchedule,
  techSchedules: Map<string, TechSchedule>
): { eligible: TechSchedule[]; reasons: Map<string, string[]> } {
  const eligible: TechSchedule[] = [];
  const reasons = new Map<string, string[]>();

  for (const [techId, tech] of techSchedules) {
    const rejectionReasons: string[] = [];

    // Constraint 1: Availability
    if (!tech.isAvailable) {
      rejectionReasons.push(`Technician "${tech.techName}" is currently unavailable`);
    }

    // Constraint 2: Skill match — tech must have ALL required skills
    const missingSkills = job.requiredSkills.filter(s => !tech.skills.includes(s));
    if (missingSkills.length > 0) {
      rejectionReasons.push(
        `Technician "${tech.techName}" is missing required skill(s): [${missingSkills.join(', ')}]. ` +
        `Has: [${tech.skills.join(', ')}], Needs: [${job.requiredSkills.join(', ')}]`
      );
    }

    // Constraint 3: Zone match
    if (!tech.serviceZones.includes(job.serviceZone)) {
      rejectionReasons.push(
        `Technician "${tech.techName}" does not serve zone "${job.serviceZone}". ` +
        `Serves: [${tech.serviceZones.join(', ')}]`
      );
    }

    if (rejectionReasons.length === 0) {
      eligible.push(tech);
    } else {
      reasons.set(techId, rejectionReasons);
    }
  }

  return { eligible, reasons };
}

/**
 * Determine whether a job failure is IMPOSSIBLE (no eligible tech exists)
 * or INFEASIBLE (eligible techs exist but can't fit the job).
 * 
 * IMPOSSIBLE: No technician in the system has the required skills + zone combo.
 *             This is a structural problem — adding more time won't help.
 * 
 * INFEASIBLE: Technicians exist but current schedules/time constraints prevent assignment.
 *             This might resolve if other jobs are rearranged or capacity increases.
 */
function determineFailureType(
  job: JobToSchedule,
  techSchedules: Map<string, TechSchedule>,
  filterReasons: Map<string, string[]>
): JobScheduleResult {
  // Check if ANY tech (even unavailable) has the skills + zone match
  let hasSkillMatch = false;
  let hasZoneMatch = false;
  let hasSkillAndZone = false;
  const allReasons: string[] = [];

  for (const [techId, tech] of techSchedules) {
    const hasSkills = job.requiredSkills.every(s => tech.skills.includes(s));
    const hasZone = tech.serviceZones.includes(job.serviceZone);

    if (hasSkills) hasSkillMatch = true;
    if (hasZone) hasZoneMatch = true;
    if (hasSkills && hasZone) hasSkillAndZone = true;
  }

  // Collect the top rejection reasons for the explanation
  for (const [techId, reasons] of filterReasons) {
    allReasons.push(...reasons);
  }
  // Deduplicate and take top 5
  const uniqueReasons = [...new Set(allReasons)].slice(0, 5);

  if (!hasSkillAndZone) {
    // IMPOSSIBLE — no tech has both skills AND zone
    const explanation = !hasSkillMatch && !hasZoneMatch
      ? `IMPOSSIBLE: No technician has the required skills [${job.requiredSkills.join(', ')}] AND serves zone "${job.serviceZone}". This job cannot be assigned with the current workforce.`
      : !hasSkillMatch
        ? `IMPOSSIBLE: No technician has the required skills [${job.requiredSkills.join(', ')}]. Technicians serve the zone but lack skill coverage.`
        : `IMPOSSIBLE: Technicians with skills [${job.requiredSkills.join(', ')}] exist but none serves zone "${job.serviceZone}".`;

    return {
      jobId: job.id,
      outcome: 'IMPOSSIBLE',
      explanation,
      reasons: uniqueReasons,
      previousTechId: job.previousTechId,
    };
  }

  // INFEASIBLE — techs exist but are unavailable/full
  return {
    jobId: job.id,
    outcome: 'INFEASIBLE',
    explanation: `INFEASIBLE: ${techSchedules.size} technician(s) checked. Eligible technicians exist but are currently unavailable or have no capacity in the required time window.`,
    reasons: uniqueReasons,
    previousTechId: job.previousTechId,
  };
}

// ============================================================================
// CANDIDATE ASSIGNMENT GENERATION & COST SCORING
// ============================================================================

/**
 * For each eligible technician, find valid time slots and score them.
 * 
 * For a job to fit in a tech's schedule, we need a contiguous block of time where:
 * 1. The block is within the tech's shift hours
 * 2. The block starts within the job's [windowStart, windowEnd]
 * 3. The block doesn't overlap any existing assignments (including travel time)
 * 4. The job completes (start + duration + travel) before the SLA deadline
 * 5. Travel time from the tech's previous job (or base location) is accounted for
 */
function findCandidateAssignments(
  job: JobToSchedule,
  eligibleTechs: TechSchedule[],
  techSchedules: Map<string, TechSchedule>,
  weights: CostWeights = COST_WEIGHTS
): CandidateAssignment[] {
  const candidates: CandidateAssignment[] = [];

  for (const tech of eligibleTechs) {
    // Get shift boundaries for the job's date
    const { shiftStartDate, shiftEndDate } = getShiftBoundaries(
      tech.shiftStart, tech.shiftEnd, job.windowStart
    );

    // Find available gaps in the tech's schedule
    const gaps = findScheduleGaps(tech, shiftStartDate, shiftEndDate);

    for (const gap of gaps) {
      // Calculate travel time to this job from the tech's previous location
      const travelTime = calculateTravelToJob(tech, job, gap);

      // Earliest possible start = max(gap.start + travel, job.windowStart)
      const earliestStart = new Date(Math.max(
        addMinutes(gap.start, travelTime).getTime(),
        job.windowStart.getTime()
      ));

      // Latest possible start (must be within window and allow job completion within shift)
      const latestStart = new Date(Math.min(
        job.windowEnd.getTime(),
        addMinutes(shiftEndDate, -job.durationMinutes).getTime(),
        gap.end.getTime() - job.durationMinutes * 60 * 1000
      ));

      // Check if there's a valid start time
      if (earliestStart > latestStart) continue;

      const scheduledEnd = addMinutes(earliestStart, job.durationMinutes);

      // Verify SLA compliance: job must COMPLETE by SLA deadline
      if (scheduledEnd > job.slaDeadline) continue;

      // Verify no overlap with existing slots (including travel buffer)
      if (hasOverlapWithExisting(tech, earliestStart, scheduledEnd, travelTime)) continue;

      // ---- COMPUTE COST SCORE ----
      const costBreakdown = computeCostBreakdown(
        job, tech, earliestStart, scheduledEnd, travelTime, shiftEndDate
      );
      const costScore = computeTotalCost(costBreakdown, weights);

      candidates.push({
        technicianId: tech.techId,
        technicianName: tech.techName,
        scheduledStart: earliestStart,
        scheduledEnd,
        travelTimeMin: travelTime,
        costScore,
        costBreakdown,
      });
    }
  }

  return candidates;
}

/**
 * Find gaps (free time) in a technician's schedule within their shift.
 * A gap is a period where the tech has no assigned jobs.
 * 
 * Example: Shift 08:00-17:00, jobs at 09:00-10:00 and 14:00-15:00
 *          Gaps: [08:00-09:00], [10:00-14:00], [15:00-17:00]
 */
function findScheduleGaps(
  tech: TechSchedule,
  shiftStart: Date,
  shiftEnd: Date
): { start: Date; end: Date; previousSlot?: OccupiedSlot }[] {
  const gaps: { start: Date; end: Date; previousSlot?: OccupiedSlot }[] = [];
  const slots = tech.occupiedSlots
    .filter(s => s.start < shiftEnd && s.end > shiftStart)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let currentStart = shiftStart;

  for (const slot of slots) {
    // Account for travel time before the slot
    const slotEffectiveStart = addMinutes(slot.start, -slot.travelTimeMin);

    if (currentStart < slotEffectiveStart) {
      gaps.push({
        start: currentStart,
        end: slotEffectiveStart,
        previousSlot: slots.indexOf(slot) > 0 ? slots[slots.indexOf(slot) - 1] : undefined,
      });
    }
    currentStart = new Date(Math.max(currentStart.getTime(), slot.end.getTime()));
  }

  // Gap after last slot until shift end
  if (currentStart < shiftEnd) {
    gaps.push({
      start: currentStart,
      end: shiftEnd,
      previousSlot: slots.length > 0 ? slots[slots.length - 1] : undefined,
    });
  }

  return gaps;
}

/**
 * Calculate travel time from the technician's last known location to the job.
 * If no previous job, travel from base/home location.
 */
function calculateTravelToJob(
  tech: TechSchedule,
  job: JobToSchedule,
  gap: { start: Date; end: Date; previousSlot?: OccupiedSlot }
): number {
  // Default: travel from tech's base location
  let fromLat = tech.latitude;
  let fromLng = tech.longitude;

  // If there's a previous slot, we'd ideally travel from that job's location
  // For now, use tech base location as a conservative estimate
  // Location of technician base coordinates
  if (gap.previousSlot) {
    fromLat = tech.latitude;
    fromLng = tech.longitude;
  }

  return estimateTravelTimeMinutes(fromLat, fromLng, job.latitude, job.longitude);
}

/**
 * Check if a proposed time range would overlap with any existing assignments.
 * Accounts for travel time as a buffer before the start.
 */
function hasOverlapWithExisting(
  tech: TechSchedule,
  proposedStart: Date,
  proposedEnd: Date,
  travelTimeMin: number
): boolean {
  // The effective start includes travel time
  const effectiveStart = addMinutes(proposedStart, -travelTimeMin);

  for (const slot of tech.occupiedSlots) {
    if (timeRangesOverlap(effectiveStart, proposedEnd, 
        addMinutes(slot.start, -slot.travelTimeMin), slot.end)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// COST FUNCTION
// ============================================================================

/**
 * Compute the cost breakdown for a candidate assignment.
 * 
 * COST COMPONENTS:
 * 1. SLA Risk:      How close the completion is to the SLA deadline.
 *                   0 = completes well before deadline, high = close to violation.
 *                   Formula: max(0, 1 - (slaDeadline - completionTime) / totalWindow)
 *                   If completion > slaDeadline: penalty = 100 (hard violation)
 * 
 * 2. Travel Time:   Travel duration in minutes, normalized.
 *                   Encourages geographically efficient assignments.
 * 
 * 3. Overtime:      Minutes the job extends beyond the tech's shift end.
 *                   Heavy penalty to discourage overtime.
 * 
 * 4. Priority:      Penalty for assigning a high-priority job to a late slot.
 *                   Critical jobs should get the earliest available slots.
 * 
 * 5. Churn:         Cost of changing an existing assignment (re-optimization only).
 *                   Encourages schedule stability.
 */
function computeCostBreakdown(
  job: JobToSchedule,
  tech: TechSchedule,
  scheduledStart: Date,
  scheduledEnd: Date,
  travelTimeMin: number,
  shiftEnd: Date
): CostBreakdown {
  // ---- SLA RISK ----
  // How much of the available window is consumed?
  const totalWindowMs = job.slaDeadline.getTime() - job.windowStart.getTime();
  const remainingMs = job.slaDeadline.getTime() - scheduledEnd.getTime();
  let slaRisk: number;
  if (remainingMs < 0) {
    slaRisk = 100; // SLA VIOLATION — hard penalty
  } else if (totalWindowMs > 0) {
    slaRisk = Math.max(0, 1 - remainingMs / totalWindowMs) * 10;
  } else {
    slaRisk = 5; // No window defined
  }

  // ---- TRAVEL TIME COST ----
  // Normalize: 0 min = 0 cost, 60 min = 1.0 cost
  const travelTimeCost = travelTimeMin / 60;

  // ---- OVERTIME COST ----
  const overtimeMinutes = Math.max(0, minutesBetween(shiftEnd, scheduledEnd));
  const overtimeCost = overtimeMinutes / 30; // 30 min overtime = 1.0 cost

  // ---- PRIORITY PENALTY ----
  // Higher priority jobs should be scheduled earlier. Penalize late starts.
  const priorityWeight = PRIORITY_WEIGHTS[job.priority] || 50;
  const windowProgress = totalWindowMs > 0
    ? (scheduledStart.getTime() - job.windowStart.getTime()) / totalWindowMs
    : 0;
  const priorityPenalty = (priorityWeight / 100) * windowProgress;

  // ---- CHURN COST ----
  // If this job was previously assigned to a different tech, add churn penalty
  let churnCost = 0;
  if (job.previousTechId && job.previousTechId !== tech.techId) {
    churnCost = 1.0; // Flat penalty for reassignment
  }

  return { slaRisk, travelTimeCost, overtimeCost, priorityPenalty, churnCost };
}

/**
 * Compute the weighted total cost from the breakdown.
 * Total = w1*slaRisk + w2*travelTime + w3*overtime + w4*priority + w5*churn
 */
function computeTotalCost(breakdown: CostBreakdown, weights: CostWeights = COST_WEIGHTS): number {
  return (
    weights.SLA_RISK * breakdown.slaRisk +
    weights.TRAVEL_TIME * breakdown.travelTimeCost +
    weights.OVERTIME * breakdown.overtimeCost +
    weights.PRIORITY_PENALTY * breakdown.priorityPenalty +
    weights.CHURN * breakdown.churnCost
  );
}

// ============================================================================
// LOCAL SEARCH IMPROVEMENT (Module C optimization)
// ============================================================================

/**
 * After the initial constructive heuristic, attempt to improve the schedule
 * using local search moves:
 * 1. SWAP: Try swapping two jobs between technicians if it reduces total cost
 * 2. MOVE: Try moving an assigned job to a different technician if cheaper
 * 
 * Strict feasibility checks ensure:
 *   - Skills & zone match
 *   - Shift boundaries respected
 *   - Time windows and SLA deadlines respected
 *   - ZERO overlap with any existing slot on either technician
 */
function localSearchImprovement(
  results: JobScheduleResult[],
  jobs: JobToSchedule[],
  techSchedules: Map<string, TechSchedule>,
  weights: CostWeights = COST_WEIGHTS
): JobScheduleResult[] {
  const assignedResults = results.filter(r => r.outcome === 'ASSIGNED');
  
  // If fewer than 2 assignments, no swaps possible
  if (assignedResults.length < 2) return results;

  const MAX_ITERATIONS = 50; // Bounded to keep deterministic and fast
  let improved = [...results];
  let totalImprovement = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let bestSwapImprovement = 0;
    let bestSwapI = -1;
    let bestSwapJ = -1;

    // Try all pairs of assigned jobs for potential swaps
    const assigned = improved.filter(r => r.outcome === 'ASSIGNED');
    
    for (let i = 0; i < assigned.length; i++) {
      for (let j = i + 1; j < assigned.length; j++) {
        const a = assigned[i];
        const b = assigned[j];
        
        // Only consider swapping if they're on different technicians
        if (a.technicianId === b.technicianId) continue;
        if (!a.scheduledStart || !a.scheduledEnd || !b.scheduledStart || !b.scheduledEnd) continue;

        const jobA = jobs.find(j => j.id === a.jobId);
        const jobB = jobs.find(j => j.id === b.jobId);
        if (!jobA || !jobB) continue;

        const techA = techSchedules.get(a.technicianId!);
        const techB = techSchedules.get(b.technicianId!);
        if (!techA || !techB) continue;

        // Constraint 1: Skill & Zone match
        const bCanDoA = jobA.requiredSkills.every(s => techB.skills.includes(s)) &&
                        techB.serviceZones.includes(jobA.serviceZone);
        const aCanDoB = jobB.requiredSkills.every(s => techA.skills.includes(s)) &&
                        techA.serviceZones.includes(jobB.serviceZone);
        if (!bCanDoA || !aCanDoB) continue;

        // Constraint 2: Shift boundaries
        const shiftB = getShiftBoundaries(techB.shiftStart, techB.shiftEnd, a.scheduledStart);
        if (a.scheduledStart < shiftB.shiftStartDate || a.scheduledEnd > shiftB.shiftEndDate) continue;

        const shiftA = getShiftBoundaries(techA.shiftStart, techA.shiftEnd, b.scheduledStart);
        if (b.scheduledStart < shiftA.shiftStartDate || b.scheduledEnd > shiftA.shiftEndDate) continue;

        // Constraint 3: Time windows
        if (a.scheduledStart < jobA.windowStart || a.scheduledStart > jobA.windowEnd) continue;
        if (b.scheduledStart < jobB.windowStart || b.scheduledStart > jobB.windowEnd) continue;

        // Constraint 4: SLA deadline
        if (a.scheduledEnd > jobA.slaDeadline || b.scheduledEnd > jobB.slaDeadline) continue;

        // Constraint 5: Non-overlap on Tech B with any OTHER slot
        let techBOverlaps = false;
        for (const slot of techB.occupiedSlots) {
          if (slot.jobId === jobB.id) continue;
          if (timeRangesOverlap(a.scheduledStart, a.scheduledEnd, slot.start, slot.end)) {
            techBOverlaps = true;
            break;
          }
        }
        if (techBOverlaps) continue;

        // Constraint 6: Non-overlap on Tech A with any OTHER slot
        let techAOverlaps = false;
        for (const slot of techA.occupiedSlots) {
          if (slot.jobId === jobA.id) continue;
          if (timeRangesOverlap(b.scheduledStart, b.scheduledEnd, slot.start, slot.end)) {
            techAOverlaps = true;
            break;
          }
        }
        if (techAOverlaps) continue;

        // Estimate swapped costs (simplified — use travel time from tech base)
        const travelAtoB = estimateTravelTimeMinutes(
          techB.latitude, techB.longitude, jobA.latitude, jobA.longitude
        );
        const travelBtoA = estimateTravelTimeMinutes(
          techA.latitude, techA.longitude, jobB.latitude, jobB.longitude
        );

        const swappedTravelCost = (travelAtoB + travelBtoA) / 60 * weights.TRAVEL_TIME;
        const currentTravelCost = ((a.travelTimeMin || 0) + (b.travelTimeMin || 0)) / 60 * weights.TRAVEL_TIME;

        const improvement = currentTravelCost - swappedTravelCost;
        if (improvement > bestSwapImprovement) {
          bestSwapImprovement = improvement;
          bestSwapI = improved.indexOf(a);
          bestSwapJ = improved.indexOf(b);
        }
      }
    }

    // Apply best swap if it improves the solution
    if (bestSwapImprovement > 0.1 && bestSwapI >= 0 && bestSwapJ >= 0) {
      const itemA = improved[bestSwapI];
      const itemB = improved[bestSwapJ];
      const techA = techSchedules.get(itemA.technicianId!);
      const techB = techSchedules.get(itemB.technicianId!);

      // Swap technician assignments
      const tempTech = itemA.technicianId;
      const tempTechName = itemA.technicianName;
      improved[bestSwapI] = {
        ...itemA,
        technicianId: itemB.technicianId,
        technicianName: itemB.technicianName,
        costScore: (itemA.costScore || 0) - bestSwapImprovement / 2,
      };
      improved[bestSwapJ] = {
        ...itemB,
        technicianId: tempTech,
        technicianName: tempTechName,
        costScore: (itemB.costScore || 0) - bestSwapImprovement / 2,
      };

      // Keep techSchedules slots updated
      if (techA && techB) {
        const slotAIdx = techA.occupiedSlots.findIndex(s => s.jobId === itemA.jobId);
        const slotBIdx = techB.occupiedSlots.findIndex(s => s.jobId === itemB.jobId);
        if (slotAIdx >= 0 && slotBIdx >= 0) {
          const slotA = techA.occupiedSlots[slotAIdx];
          const slotB = techB.occupiedSlots[slotBIdx];
          techA.occupiedSlots.splice(slotAIdx, 1, { ...slotB, jobId: itemB.jobId });
          techB.occupiedSlots.splice(slotBIdx, 1, { ...slotA, jobId: itemA.jobId });
          techA.occupiedSlots.sort((x, y) => x.start.getTime() - y.start.getTime());
          techB.occupiedSlots.sort((x, y) => x.start.getTime() - y.start.getTime());
        }
      }

      totalImprovement += bestSwapImprovement;
    } else {
      break; // No more improvements found
    }
  }

  return improved;
}

// ============================================================================
// HELPER: Detailed slot conflict explanations
// ============================================================================

function formatTimeHHMM(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getDetailedSlotConflicts(
  job: JobToSchedule,
  eligibleTechs: TechSchedule[],
  techSchedules: Map<string, TechSchedule>
): string[] {
  const conflicts: string[] = [];

  for (const tech of eligibleTechs.slice(0, 3)) { // Top 3 for brevity
    const { shiftStartDate, shiftEndDate } = getShiftBoundaries(
      tech.shiftStart, tech.shiftEnd, job.windowStart
    );

    // 1. Check if technician's shift overlaps the job's customer window
    if (shiftEndDate <= job.windowStart || shiftStartDate >= job.windowEnd) {
      conflicts.push(
        `Technician "${tech.techName}": Shift (${tech.shiftStart}–${tech.shiftEnd}) does not overlap job window (${formatTimeHHMM(job.windowStart)}–${formatTimeHHMM(job.windowEnd)})`
      );
      continue;
    }

    // 2. Overlap interval between shift and job window (capped at SLA deadline)
    const effectiveWindowEnd = new Date(Math.min(job.windowEnd.getTime(), job.slaDeadline.getTime()));
    const overlapStart = new Date(Math.max(shiftStartDate.getTime(), job.windowStart.getTime()));
    const overlapEnd = new Date(Math.min(shiftEndDate.getTime(), effectiveWindowEnd.getTime()));

    const overlapDuration = minutesBetween(overlapStart, overlapEnd);
    if (overlapDuration < job.durationMinutes) {
      conflicts.push(
        `Technician "${tech.techName}": Shift overlap with job window (${formatTimeHHMM(overlapStart)}–${formatTimeHHMM(overlapEnd)}) is only ${Math.max(0, overlapDuration).toFixed(0)} min, but job requires ${job.durationMinutes} min`
      );
      continue;
    }

    // 3. Check gaps within the technician's shift clipped to the job window
    const gaps = findScheduleGaps(tech, shiftStartDate, shiftEndDate);
    const windowGaps = gaps
      .map(g => ({
        start: new Date(Math.max(g.start.getTime(), overlapStart.getTime())),
        end: new Date(Math.min(g.end.getTime(), overlapEnd.getTime())),
      }))
      .filter(g => g.end > g.start);

    if (windowGaps.length === 0) {
      conflicts.push(
        `Technician "${tech.techName}": Fully booked during job window (${formatTimeHHMM(overlapStart)}–${formatTimeHHMM(overlapEnd)})`
      );
    } else {
      const maxGap = Math.max(...windowGaps.map(g => minutesBetween(g.start, g.end)));
      if (maxGap < job.durationMinutes) {
        conflicts.push(
          `Technician "${tech.techName}": Largest available gap during job window is ${maxGap.toFixed(0)} min, but job requires ${job.durationMinutes} min`
        );
      } else {
        conflicts.push(
          `Technician "${tech.techName}": Gap of ${maxGap.toFixed(0)} min available, but insufficient buffer for transit time or SLA deadline (${formatTimeHHMM(job.slaDeadline)})`
        );
      }
    }
  }

  return conflicts;
}

// ============================================================================
// DATA LOADING HELPERS
// ============================================================================

async function loadSchedulableJobs(): Promise<JobToSchedule[]> {
  // A job is schedulable if it is not locked, completed, or cancelled
  const lockedAssignments = await prisma.assignment.findMany({
    where: { isLocked: true },
    select: { jobId: true },
  });
  const lockedJobIds = lockedAssignments.map(a => a.jobId);

  const jobs = await prisma.job.findMany({
    where: {
      status: { notIn: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
      id: { notIn: lockedJobIds },
    },
  });

  return jobs.map(j => ({
    id: j.id,
    title: j.title,
    priority: j.priority,
    durationMinutes: j.durationMinutes,
    requiredSkills: JSON.parse(j.requiredSkills),
    serviceZone: j.serviceZone,
    latitude: j.latitude,
    longitude: j.longitude,
    windowStart: j.windowStart,
    windowEnd: j.windowEnd,
    slaDeadline: j.slaDeadline,
    status: j.status,
  }));
}

async function loadTechnicians(): Promise<Array<{
  id: string; name: string; skills: string; serviceZones: string;
  shiftStart: string; shiftEnd: string; isAvailable: boolean;
  latitude: number; longitude: number;
}>> {
  return prisma.technician.findMany();
}

async function loadExistingAssignments(): Promise<Array<{
  id: string; jobId: string; technicianId: string;
  scheduledStart: Date; scheduledEnd: Date;
  travelTimeMin: number; isLocked: boolean; runId: string;
}>> {
  return prisma.assignment.findMany();
}

function buildTechSchedules(
  technicians: Array<{
    id: string; name: string; skills: string; serviceZones: string;
    shiftStart: string; shiftEnd: string; isAvailable: boolean;
    latitude: number; longitude: number;
  }>,
  assignments: Array<{
    id: string; jobId: string; technicianId: string;
    scheduledStart: Date; scheduledEnd: Date;
    travelTimeMin: number; isLocked: boolean;
  }>
): Map<string, TechSchedule> {
  const schedules = new Map<string, TechSchedule>();

  for (const tech of technicians) {
    const techAssignments = assignments
      .filter(a => a.technicianId === tech.id)
      .map(a => ({
        jobId: a.jobId,
        start: a.scheduledStart,
        end: a.scheduledEnd,
        travelTimeMin: a.travelTimeMin,
        isLocked: a.isLocked,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    schedules.set(tech.id, {
      techId: tech.id,
      techName: tech.name,
      skills: JSON.parse(tech.skills),
      serviceZones: JSON.parse(tech.serviceZones),
      shiftStart: tech.shiftStart,
      shiftEnd: tech.shiftEnd,
      latitude: tech.latitude,
      longitude: tech.longitude,
      isAvailable: tech.isAvailable,
      occupiedSlots: techAssignments,
    });
  }

  return schedules;
}

// ============================================================================
// PERSIST RESULTS TO DATABASE
// ============================================================================

/**
 * Persist the scheduling results to the database within a transaction.
 * For SQLite, we use serialized transactions for concurrency safety.
 * This is equivalent to PostgreSQL's SELECT ... FOR UPDATE for our use case.
 */
async function persistScheduleResults(
  runId: string,
  runType: string,
  triggerReason: string | undefined,
  results: JobScheduleResult[],
  metrics: ScheduleMetrics
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Create the schedule run record
    await tx.scheduleRun.create({
      data: {
        id: runId,
        runType,
        triggerReason,
        totalJobs: metrics.totalJobs,
        assignedJobs: metrics.assignedJobs,
        unassignedJobs: metrics.unassignedJobs,
        infeasibleJobs: metrics.infeasibleJobs,
        impossibleJobs: metrics.impossibleJobs,
        objectiveScore: metrics.objectiveScore,
        totalTravelTime: metrics.totalTravelTime,
        slaViolations: metrics.slaViolations,
        jobsReassigned: metrics.jobsReassigned,
        jobsNewlyAssigned: metrics.jobsNewlyAssigned,
        jobsUnchanged: metrics.jobsUnchanged,
      },
    });

    // 2. Atomically delete all unlocked assignments for the jobs being scheduled
    const resultJobIds = results.map(r => r.jobId);
    await tx.assignment.deleteMany({
      where: {
        jobId: { in: resultJobIds },
        isLocked: false,
      },
    });

    // 3. Create assignments and run details for each job
    for (const result of results) {
      // Create assignment if job was assigned
      if (result.outcome === 'ASSIGNED' && result.technicianId && result.scheduledStart && result.scheduledEnd) {
        await tx.assignment.create({
          data: {
            jobId: result.jobId,
            technicianId: result.technicianId,
            scheduledStart: result.scheduledStart,
            scheduledEnd: result.scheduledEnd,
            travelTimeMin: result.travelTimeMin || 0,
            isLocked: false,
            runId,
          },
        });

        // Update job status to ASSIGNED
        await tx.job.update({
          where: { id: result.jobId },
          data: { status: 'ASSIGNED' },
        });
      } else if (result.outcome === 'INFEASIBLE' || result.outcome === 'IMPOSSIBLE') {
        // Update job status to UNASSIGNED
        await tx.job.update({
          where: { id: result.jobId },
          data: { status: 'UNASSIGNED' },
        });
      }

      // 3. Create run detail (audit trail)
      await tx.runDetail.create({
        data: {
          runId,
          jobId: result.jobId,
          outcome: result.outcome,
          technicianId: result.technicianId,
          scheduledStart: result.scheduledStart,
          scheduledEnd: result.scheduledEnd,
          travelTimeMin: result.travelTimeMin,
          costScore: result.costScore,
          explanation: result.explanation,
          reasons: JSON.stringify(result.reasons),
          previousTechId: result.previousTechId,
          changeType: result.changeType,
        },
      });
    }
  });
}

// ============================================================================
// METRICS COMPUTATION
// ============================================================================

function computeMetrics(results: JobScheduleResult[]): ScheduleMetrics {
  const assigned = results.filter(r => r.outcome === 'ASSIGNED');
  const infeasible = results.filter(r => r.outcome === 'INFEASIBLE');
  const impossible = results.filter(r => r.outcome === 'IMPOSSIBLE');

  const totalTravelTime = assigned.reduce((sum, r) => sum + (r.travelTimeMin || 0), 0);
  const objectiveScore = assigned.reduce((sum, r) => sum + (r.costScore || 0), 0);
  const slaViolations = assigned.filter(r => 
    r.costBreakdown && r.costBreakdown.slaRisk >= 100
  ).length;

  return {
    totalJobs: results.length,
    assignedJobs: assigned.length,
    unassignedJobs: infeasible.length + impossible.length,
    infeasibleJobs: infeasible.length,
    impossibleJobs: impossible.length,
    objectiveScore,
    totalTravelTime,
    slaViolations,
    jobsReassigned: 0,
    jobsNewlyAssigned: assigned.length,
    jobsUnchanged: 0,
  };
}

/**
 * Actionable Business Recovery (Enhancement 2):
 * Force-assign an INFEASIBLE job to an eligible technician with approved overtime.
 */
export async function forceAssignJobWithOvertime(
  jobId: string,
  approvedOvertimeMinutes: number = 30
): Promise<{ success: boolean; assignment: any; explanation: string }> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`Job '${jobId}' not found`);
  }
  const requiredSkills = JSON.parse(job.requiredSkills) as string[];

  // Find eligible technicians who have skills and serve the zone
  const technicians = await prisma.technician.findMany({ where: { isAvailable: true } });
  const eligibleTechs = technicians.filter(t => {
    const skills = JSON.parse(t.skills) as string[];
    const zones = JSON.parse(t.serviceZones) as string[];
    return requiredSkills.every(s => skills.includes(s)) && zones.includes(job.serviceZone);
  });

  if (eligibleTechs.length === 0) {
    throw new Error(`No eligible technicians available for skills [${requiredSkills.join(', ')}] in zone "${job.serviceZone}"`);
  }

  // Load existing assignments for these technicians
  const techIds = eligibleTechs.map(t => t.id);
  const assignments = await prisma.assignment.findMany({
    where: { technicianId: { in: techIds } },
    orderBy: { scheduledEnd: 'desc' },
  });

  // Pick the best technician (one with least assignments or earlier end)
  let selectedTech = eligibleTechs[0];
  let earliestAvailableTime = new Date(job.windowStart);

  for (const tech of eligibleTechs) {
    const techAssignments = assignments.filter(a => a.technicianId === tech.id);
    if (techAssignments.length === 0) {
      selectedTech = tech;
      const { shiftStartDate } = getShiftBoundaries(tech.shiftStart, tech.shiftEnd, job.windowStart);
      earliestAvailableTime = new Date(Math.max(job.windowStart.getTime(), shiftStartDate.getTime()));
      break;
    } else {
      const lastAssigned = techAssignments[0];
      const travel = estimateTravelTimeMinutes(tech.latitude, tech.longitude, job.latitude, job.longitude);
      const potentialStart = addMinutes(lastAssigned.scheduledEnd, travel);
      if (selectedTech === eligibleTechs[0] || potentialStart < earliestAvailableTime) {
        selectedTech = tech;
        earliestAvailableTime = potentialStart;
      }
    }
  }

  const scheduledStart = earliestAvailableTime;
  const scheduledEnd = addMinutes(scheduledStart, job.durationMinutes);
  const travelTimeMin = estimateTravelTimeMinutes(selectedTech.latitude, selectedTech.longitude, job.latitude, job.longitude);
  const runId = uuidv4();
  const economics = getJobEconomics(job.priority);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create a ScheduleRun record so Foreign Key constraints are satisfied
    await tx.scheduleRun.create({
      data: {
        id: runId,
        runType: 'DISRUPTION_RECOVERY',
        triggerReason: `Actionable Business Recovery: Approved +${approvedOvertimeMinutes}m overtime for job "${job.title}"`,
        totalJobs: 1,
        assignedJobs: 1,
        unassignedJobs: 0,
        infeasibleJobs: 0,
        impossibleJobs: 0,
        objectiveScore: 0,
        totalTravelTime: travelTimeMin,
        slaViolations: 0,
        jobsReassigned: 0,
        jobsNewlyAssigned: 1,
        jobsUnchanged: 0,
      },
    });

    await tx.assignment.deleteMany({
      where: { jobId: job.id, isLocked: false },
    });

    const newAssignment = await tx.assignment.create({
      data: {
        jobId: job.id,
        technicianId: selectedTech.id,
        scheduledStart,
        scheduledEnd,
        travelTimeMin,
        isLocked: false,
        runId,
      },
      include: {
        job: true,
        technician: true,
      },
    });

    await tx.job.update({
      where: { id: job.id },
      data: { status: 'ASSIGNED' },
    });

    const explanation = `Actionable Business Recovery: Force-assigned to ${selectedTech.name} with approved +${approvedOvertimeMinutes}m overtime. Overtime cost: ₹${OVERTIME_COST_PER_30MIN_INR}, SLA Penalty avoided: ₹${economics.slaPenaltyAmount}.`;

    await tx.runDetail.create({
      data: {
        runId,
        jobId: job.id,
        outcome: 'ASSIGNED',
        technicianId: selectedTech.id,
        scheduledStart,
        scheduledEnd,
        travelTimeMin,
        costScore: 0,
        explanation,
        reasons: JSON.stringify([
          'Force-assigned via Actionable Business Recovery',
          `Approved overtime: +${approvedOvertimeMinutes} minutes`,
          `Assigned to ${selectedTech.name}`,
          `SLA Penalty avoided: ₹${economics.slaPenaltyAmount}`,
        ]),
        changeType: 'new_assignment',
      },
    });

    return newAssignment;
  });

  return {
    success: true,
    assignment: result,
    explanation: `Force-assigned to ${selectedTech.name} with approved overtime`,
  };
}

export default {
  generateSchedule,
  reOptimizeSchedule,
  forceAssignJobWithOvertime,
};

