import { Router } from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { validateRegistration, validateLogin } from '../middleware/validationMiddleware';

const router = Router();

router.post('/register', validateRegistration(), registerUser);
router.post('/login', validateLogin(), loginUser);
router.post('/refresh', protect, refreshToken);
router.post('/logout', logoutUser);

export default router;