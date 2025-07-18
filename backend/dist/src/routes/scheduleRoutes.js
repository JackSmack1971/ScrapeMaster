"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scheduleController_1 = require("../controllers/scheduleController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Middleware to protect routes
router.use(authMiddleware_1.protect);
// POST /api/scrapers/:id/schedule - Create scheduled job
router.post('/scrapers/:id/schedule', scheduleController_1.createScheduledJob);
// PUT /api/schedules/:id - Update schedule configuration
router.put('/schedules/:id', scheduleController_1.updateScheduleConfiguration);
// DELETE /api/schedules/:id - Remove scheduled job
router.delete('/schedules/:id', scheduleController_1.removeScheduledJob);
// GET /api/schedules/history - Get execution history
router.get('/schedules/history', scheduleController_1.getExecutionHistory);
exports.default = router;
