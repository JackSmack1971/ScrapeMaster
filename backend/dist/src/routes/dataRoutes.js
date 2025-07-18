"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// dataRoutes.ts
const express_1 = require("express");
const DataController_1 = require("../controllers/DataController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Using 'protect' middleware
const router = (0, express_1.Router)();
// Route to ingest scraped data
router.post('/ingest', authMiddleware_1.protect, DataController_1.ingestScrapedData);
// Route to get scraped data with filtering, searching, pagination, etc.
router.get('/', authMiddleware_1.protect, DataController_1.getScrapedData);
// Route to export scraped data
router.post('/export', authMiddleware_1.protect, DataController_1.exportScrapedData);
exports.default = router;
