import { Router } from 'express';
import { body } from 'express-validator';
import { ProjectService } from '../services/ProjectService';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthenticatedRequest } from '../types/api';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const projects = ProjectService.list(userId);
  res.json({ success: true, data: projects });
});

router.post('/',
  requireAuth,
  body('name').notEmpty(),
  validate,
  (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    const project = ProjectService.create(userId, req.body.name, req.body.description);
    res.status(201).json({ success: true, data: project });
  });

router.get('/:id', requireAuth, (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const project = ProjectService.get(req.params.id, userId);
  if (!project) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  res.json({ success: true, data: project });
});

router.put('/:id',
  requireAuth,
  body('name').notEmpty(),
  validate,
  (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.id;
    const project = ProjectService.update(req.params.id, userId, req.body.name, req.body.description);
    if (!project) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: project });
  });

router.delete('/:id', requireAuth, (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const ok = ProjectService.delete(req.params.id, userId);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  res.status(204).send();
});

export default router;
