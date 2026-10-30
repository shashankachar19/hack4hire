// ============================================================================
// DispatchGrid — Shared Type Definitions
// These types are used across the entire backend: controllers, services, engine
// ============================================================================

export interface TechnicianInput {
  name: string;
  skills: string[];
  serviceZones: string[];
  shiftStart: string; // HH:mm
  shiftEnd: string;   // HH:mm
  latitude?: number;
  longitude?: number;
}

export interface JobInput {
  title: string;
  description?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  durationMinutes: number;
  requiredSkills: string[];
  serviceZone: string;
  latitude: number;
  longitude: number;
  windowStart: string; // ISO datetime
  windowEnd: string;   // ISO datetime
  slaDeadline: string; // ISO datetime
  idempotencyKey?: string;
}

export type JobStatusType = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'UNASSIGNED';

// ============================================================================
// Valid state transitions for the Job State Machine (Module A)
// ============================================================================
export const VALID_JOB_TRANSITIONS: Record<JobStatusType, JobStatusType[]> = {
  PENDING:     ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:    ['IN_PROGRESS', 'UNASSIGNED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [], // Terminal state
  CANCELLED:   [], // Terminal state
  UNASSIGNED:  ['ASSIGNED', 'CANCELLED'], // Can be re-assigned by scheduler
};

// ============================================================================
// Scheduling Engine Types (Modules B/C)
// ============================================================================

/** A technician's schedule slot — represents one block of time in their day */
export interface TimeSlot {
  start: Date;
  end: Date;
  jobId?: string; // If occupied by a job
  travelTimeMin?: number;
}

/** Candidate assignment: a potential (technician, timeslot) pair for a job */
export interface CandidateAssignment {
  technicianId: string;
  technicianName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  travelTimeMin: number;
  costScore: number;         // Lower is better
  costBreakdown: CostBreakdown;
}

/** Detailed cost breakdown for explainability */
export interface CostBreakdown {
  slaRisk: number;           // How close to SLA deadline (0 = safe, higher = risky)
  travelTimeCost: number;    // Travel time penalty
  overtimeCost: number;      // Overtime beyond shift end
  priorityPenalty: number;   // Penalty for assigning low-priority tech to high-priority job
  churnCost: number;         // Cost of changing existing assignment
}

/** Result of scheduling a single job */
export interface JobScheduleResult {
  jobId: string;
  outcome: 'ASSIGNED' | 'INFEASIBLE' | 'IMPOSSIBLE';
  technicianId?: string;
  technicianName?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  travelTimeMin?: number;
  costScore?: number;
  costBreakdown?: CostBreakdown;
  explanation: string;
  reasons: string[];
  previousTechId?: string;
  changeType?: 'new_assignment' | 'reassigned' | 'unchanged' | 'unassigned';
}

/** Full schedule result for all jobs in a run */
export interface ScheduleResult {
  runId: string;
  runType: 'INITIAL' | 'RE_OPTIMIZATION' | 'DISRUPTION_RECOVERY';
  triggerReason?: string;
  results: JobScheduleResult[];
  metrics: ScheduleMetrics;
}

export interface ScheduleMetrics {
  totalJobs: number;
  assignedJobs: number;
  unassignedJobs: number;
  infeasibleJobs: number;
  impossibleJobs: number;
  objectiveScore: number;
  totalTravelTime: number;
  slaViolations: number;
  jobsReassigned: number;
  jobsNewlyAssigned: number;
  jobsUnchanged: number;
}

/** Priority weights for the cost function */
export const PRIORITY_WEIGHTS: Record<string, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
};

/** Cost function weights — tunable parameters */
export const COST_WEIGHTS = {
  SLA_RISK: 10.0,          // Heavy penalty for SLA violations
  TRAVEL_TIME: 2.0,        // Moderate penalty for travel
  OVERTIME: 5.0,           // Significant penalty for overtime
  PRIORITY_PENALTY: 3.0,   // Penalty for unassigned high-priority jobs
  CHURN: 1.5,              // Light penalty for schedule changes
};

export type CostWeights = typeof COST_WEIGHTS;

// ============================================================================
// Unit Economics & Financial Telemetry (INR ₹)
// ============================================================================

export const PRIORITY_TICKET_VALUE: Record<string, number> = {
  CRITICAL: 5000,
  HIGH: 3500,
  MEDIUM: 2200,
  LOW: 1200,
};

export const PRIORITY_SLA_PENALTY: Record<string, number> = {
  CRITICAL: 8000,
  HIGH: 4500,
  MEDIUM: 2000,
  LOW: 600,
};

export const TRAVEL_COST_PER_MINUTE_INR = 10;
export const OVERTIME_COST_PER_30MIN_INR = 250;

export function getJobEconomics(priority: string) {
  const p = priority.toUpperCase();
  return {
    ticketValue: PRIORITY_TICKET_VALUE[p] || 2200,
    slaPenaltyAmount: PRIORITY_SLA_PENALTY[p] || 2000,
  };
}

export interface FinancialTelemetry {
  totalScheduledRevenue: number;   // ₹ Sum of ticket values for assigned jobs
  slaPenaltiesAvoided: number;     // ₹ Sum of potential penalties saved on assigned jobs
  estimatedTravelCost: number;     // ₹ Total travel minutes * ₹10/min
  estimatedLaborCost: number;      // ₹ Estimated labor wages
  netProfit: number;               // ₹ Revenue - Travel Cost - Labor Cost
  netMarginPercentage: number;     // % Profit margin
}

// ============================================================================
// Disruption Types (Module D)
// ============================================================================

export interface TechDropoutInput {
  technicianId: string;
  reason?: string;
}

export interface UrgentJobInput extends JobInput {
  // Same as JobInput but flagged as urgent
}

export interface DurationExtensionInput {
  jobId: string;
  newDurationMinutes: number;
  reason?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

