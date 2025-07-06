import { Router } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { validate } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';

const router = Router();

router.post('/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  validate,
  async (req, res) => {
    const user = await AuthService.register(req.body.email, req.body.password);
    res.status(201).json({ success: true, data: { id: user.id }, message: 'Registered' });
  });

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res) => {
    const token = await AuthService.authenticate(req.body.email, req.body.password);
    if (!token) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
    res.json({ success: true, data: { token } });
  });

router.post('/refresh', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  const token = AuthService.refresh(userId);
  if (!token) {
    res.status(401).json({ success: false, error: 'Invalid session' });
    return;
  }
  res.json({ success: true, data: { token } });
});

router.post('/logout', requireAuth, (req, res) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  AuthService.logout(userId);
  res.json({ success: true, message: 'Logged out' });
});

export default router;
