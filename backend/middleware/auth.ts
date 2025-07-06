import { RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types/api';

export const requireAuth: RequestHandler = (req: AuthenticatedRequest, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, error: 'Missing token' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token) as any;
    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
