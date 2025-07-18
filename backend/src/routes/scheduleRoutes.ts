import { Router, RequestHandler } from 'express';
import {
  createScheduledJob,
  updateScheduleConfiguration,
  removeScheduledJob,
  getExecutionHistory,
} from '../controllers/scheduleController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Middleware to protect routes
router.use(protect);

// POST /api/scrapers/:id/schedule - Create scheduled job
router.post('/scrapers/:id/schedule', createScheduledJob as RequestHandler);

// PUT /api/schedules/:id - Update schedule configuration
router.put('/schedules/:id', updateScheduleConfiguration as RequestHandler);

// DELETE /api/schedules/:id - Remove scheduled job
router.delete('/schedules/:id', removeScheduledJob as RequestHandler);

// GET /api/schedules/history - Get execution history
router.get('/schedules/history', getExecutionHistory as RequestHandler);

export default router;