import { Router } from 'express';
import { body } from 'express-validator';
import { ScraperService } from '../services/ScraperService';
import { ProjectService } from '../services/ProjectService';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthenticatedRequest } from '../types/api';

const router = Router();

router.get('/projects/:id/scrapers', requireAuth, (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const project = ProjectService.get(req.params.id, userId);
  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }
  res.json({ success: true, data: ScraperService.list(req.params.id) });
});

router.post('/projects/:id/scrapers',
  requireAuth,
  body('name').notEmpty(),
  body('config').isObject(),
  validate,
  (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    const project = ProjectService.get(req.params.id, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }
    const scraper = ScraperService.create(req.params.id, req.body.name, req.body.config);
    res.status(201).json({ success: true, data: scraper });
  });

router.get('/scrapers/:id', requireAuth, (req, res) => {
  const scraper = ScraperService.get(req.params.id);
  if (!scraper) {
    res.status(404).json({ success: false, error: 'Scraper not found' });
    return;
  }
  const userId = (req as AuthenticatedRequest).user!.id;
  const project = ProjectService.get(scraper.projectId, userId);
  if (!project) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  res.json({ success: true, data: scraper });
});

router.put('/scrapers/:id',
  requireAuth,
  body('name').notEmpty(),
  body('config').isObject(),
  validate,
  (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    const scraper = ScraperService.get(req.params.id);
    if (!scraper) {
      res.status(404).json({ success: false, error: 'Scraper not found' });
      return;
    }
    const project = ProjectService.get(scraper.projectId, userId);
    if (!project) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    const updated = ScraperService.update(req.params.id, req.body.name, req.body.config);
    res.json({ success: true, data: updated });
  });

router.delete('/scrapers/:id', requireAuth, (req, res) => {
  const scraper = ScraperService.get(req.params.id);
  if (!scraper) {
    res.status(404).json({ success: false, error: 'Scraper not found' });
    return;
  }
  const userId = (req as AuthenticatedRequest).user!.id;
  const project = ProjectService.get(scraper.projectId, userId);
  if (!project) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  ScraperService.delete(req.params.id);
  res.status(204).send();
});

export default router;
