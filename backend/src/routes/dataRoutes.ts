// dataRoutes.ts
import { Router } from 'express';
import { ingestScrapedData, getScrapedData, exportScrapedData, getAnalysisReport } from '../controllers/DataController';
import { protect } from '../middleware/authMiddleware'; // Using 'protect' middleware

const router = Router();

// Route to ingest scraped data
router.post('/ingest', protect, ingestScrapedData);

// Route to get scraped data with filtering, searching, pagination, etc.
router.get('/', protect, getScrapedData);

// Route to export scraped data
router.post('/export', protect, exportScrapedData);

// Route to get data analysis report for a project
router.get('/:project_id/analysis', protect, getAnalysisReport);

export default router;