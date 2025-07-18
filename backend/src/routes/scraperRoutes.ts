import { Router } from 'express';
import { getScrapers, createScraper, getScraperById, updateScraper, deleteScraper } from '../controllers/scraperController';
import { protect } from '../middleware/authMiddleware';
import { validateScraperCreation, validateScraperUpdate, validateScraperId, validateProjectId } from '../middleware/validationMiddleware';

const router = Router();

router.use(protect); // All scraper routes are protected

// Routes for scrapers within a project
router.route('/projects/:id/scrapers')
  .get(validateProjectId(), getScrapers)
  .post(validateScraperCreation(), createScraper);

// Routes for individual scrapers
router.route('/scrapers/:id')
  .get(validateScraperId(), getScraperById)
  .put(validateScraperUpdate(), updateScraper)
  .delete(validateScraperId(), deleteScraper);

export default router;