import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  detectPagination,
  testPaginationPattern,
} from '../controllers/paginationController';

const router = Router();

router.use(protect); // All pagination routes are protected

router.post('/detect-pagination', detectPagination);
router.post('/test-pagination-pattern', testPaginationPattern);

export default router;