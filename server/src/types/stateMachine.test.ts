// ============================================================================
// DispatchGrid — Unit Tests: State Machine & Validation
// Tests for: valid/invalid state transitions, input validation, constraint logic
// ============================================================================

import { VALID_JOB_TRANSITIONS, JobStatusType, PRIORITY_WEIGHTS, COST_WEIGHTS } from '../types';

// ============================================================================
// State Machine Tests (Module A)
// ============================================================================

describe('Job State Machine', () => {
  test('PENDING can transition to ASSIGNED or CANCELLED only', () => {
    const allowed = VALID_JOB_TRANSITIONS['PENDING'];
    expect(allowed).toContain('ASSIGNED');
    expect(allowed).toContain('CANCELLED');
    expect(allowed).not.toContain('IN_PROGRESS');
    expect(allowed).not.toContain('COMPLETED');
    expect(allowed).not.toContain('UNASSIGNED');
    expect(allowed).toHaveLength(2);
  });

  test('ASSIGNED can transition to IN_PROGRESS, UNASSIGNED, or CANCELLED', () => {
    const allowed = VALID_JOB_TRANSITIONS['ASSIGNED'];
    expect(allowed).toContain('IN_PROGRESS');
    expect(allowed).toContain('UNASSIGNED');
    expect(allowed).toContain('CANCELLED');
    expect(allowed).not.toContain('PENDING');
    expect(allowed).not.toContain('COMPLETED');
    expect(allowed).toHaveLength(3);
  });

  test('IN_PROGRESS can transition to COMPLETED or CANCELLED only', () => {
    const allowed = VALID_JOB_TRANSITIONS['IN_PROGRESS'];
    expect(allowed).toContain('COMPLETED');
    expect(allowed).toContain('CANCELLED');
    expect(allowed).not.toContain('PENDING');
    expect(allowed).not.toContain('ASSIGNED');
    expect(allowed).toHaveLength(2);
  });

  test('COMPLETED is a terminal state (no transitions)', () => {
    const allowed = VALID_JOB_TRANSITIONS['COMPLETED'];
    expect(allowed).toHaveLength(0);
  });

  test('CANCELLED is a terminal state (no transitions)', () => {
    const allowed = VALID_JOB_TRANSITIONS['CANCELLED'];
    expect(allowed).toHaveLength(0);
  });

  test('UNASSIGNED can transition to ASSIGNED or CANCELLED', () => {
    const allowed = VALID_JOB_TRANSITIONS['UNASSIGNED'];
    expect(allowed).toContain('ASSIGNED');
    expect(allowed).toContain('CANCELLED');
    expect(allowed).toHaveLength(2);
  });

  test('all statuses have defined transitions', () => {
    const allStatuses: JobStatusType[] = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNASSIGNED'];
    allStatuses.forEach(status => {
      expect(VALID_JOB_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(VALID_JOB_TRANSITIONS[status])).toBe(true);
    });
  });

  test('no self-transitions are allowed', () => {
    const allStatuses: JobStatusType[] = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNASSIGNED'];
    allStatuses.forEach(status => {
      expect(VALID_JOB_TRANSITIONS[status]).not.toContain(status);
    });
  });

  test('invalid transition: PENDING -> IN_PROGRESS is rejected', () => {
    const allowed = VALID_JOB_TRANSITIONS['PENDING'];
    expect(allowed.includes('IN_PROGRESS' as JobStatusType)).toBe(false);
  });

  test('invalid transition: COMPLETED -> PENDING is rejected', () => {
    const allowed = VALID_JOB_TRANSITIONS['COMPLETED'];
    expect(allowed.includes('PENDING' as JobStatusType)).toBe(false);
  });
});

// ============================================================================
// Priority Weights Tests
// ============================================================================

describe('Priority Weights', () => {
  test('CRITICAL has the highest weight', () => {
    expect(PRIORITY_WEIGHTS['CRITICAL']).toBeGreaterThan(PRIORITY_WEIGHTS['HIGH']);
    expect(PRIORITY_WEIGHTS['HIGH']).toBeGreaterThan(PRIORITY_WEIGHTS['MEDIUM']);
    expect(PRIORITY_WEIGHTS['MEDIUM']).toBeGreaterThan(PRIORITY_WEIGHTS['LOW']);
  });

  test('all priorities have positive weights', () => {
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(p => {
      expect(PRIORITY_WEIGHTS[p]).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Cost Function Weights Tests
// ============================================================================

describe('Cost Function Weights', () => {
  test('SLA_RISK has the highest weight (safety-critical)', () => {
    expect(COST_WEIGHTS.SLA_RISK).toBeGreaterThanOrEqual(COST_WEIGHTS.TRAVEL_TIME);
    expect(COST_WEIGHTS.SLA_RISK).toBeGreaterThanOrEqual(COST_WEIGHTS.OVERTIME);
    expect(COST_WEIGHTS.SLA_RISK).toBeGreaterThanOrEqual(COST_WEIGHTS.PRIORITY_PENALTY);
    expect(COST_WEIGHTS.SLA_RISK).toBeGreaterThanOrEqual(COST_WEIGHTS.CHURN);
  });

  test('CHURN has the lowest weight (schedule stability is nice but not critical)', () => {
    expect(COST_WEIGHTS.CHURN).toBeLessThanOrEqual(COST_WEIGHTS.SLA_RISK);
    expect(COST_WEIGHTS.CHURN).toBeLessThanOrEqual(COST_WEIGHTS.OVERTIME);
  });

  test('all weights are positive', () => {
    Object.values(COST_WEIGHTS).forEach(w => {
      expect(w).toBeGreaterThan(0);
    });
  });
});

