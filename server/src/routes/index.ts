// ============================================================================
// DispatchGrid — Route Definitions
// Central router that wires all controllers together.
//
// Route map:
//   /api/technicians  → technicianController  (CRUD for technicians)
//   /api/jobs          → jobController          (CRUD + state machine for jobs)
//   /api/schedule      → scheduleController     (schedule generation & viewing)
//   /api/disruptions   → disruptionController   (real-time disruption handling)
// ============================================================================

import { Router } from 'express';
import technicianController from '../controllers/technicianController';
import jobController from '../controllers/jobController';
import scheduleController from '../controllers/scheduleController';
import disruptionController from '../controllers/disruptionController';
import customerController from '../controllers/customerController';
import authController from '../controllers/authController';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { seed } from '../seed';
import { getRecentSentEmails } from '../services/emailService';

const router = Router();

// ---- Dispatched Emails & Live Audit Feed ----
router.get('/notifications/recent-emails', (_req, res) => {
  res.json({
    success: true,
    data: getRecentSentEmails(),
  });
});

// ---- Seed & Reset routes ----
router.post('/seed/reset', async (_req, res, next) => {
  try {
    await seed();
    res.json({
      success: true,
      data: { message: 'Database reset to pristine 20-technician, 100-job seed state' },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset', async (_req, res, next) => {
  try {
    await seed();
    res.json({
      success: true,
      data: { message: 'Database reset to pristine 20-technician, 100-job seed state' },
    });
  } catch (err) {
    next(err);
  }
});

// ---- Technician routes ----
router.use('/technicians', technicianController);

// ---- Customer routes ----
router.use('/customers', customerController);

// ---- Authentication & OTP routes ----
router.use('/auth', authController);

// ---- Job routes ----
// Apply idempotency middleware ONLY to POST /api/jobs (job creation).
// The middleware checks for an `Idempotency-Key` header and returns
// cached responses for duplicate requests.
router.use('/jobs', jobController);

// ---- Schedule routes ----
router.use('/schedule', scheduleController);

// ---- Disruption routes ----
router.use('/disruptions', disruptionController);

// Catch-all 404 for undefined /api routes
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API route not found',
    },
  });
});

export default router;
