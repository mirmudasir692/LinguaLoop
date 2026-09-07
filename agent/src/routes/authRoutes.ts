import { Router } from 'express';
import {
  getProfile,
  login,
  logout,
  register,
} from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, getProfile);

export default router;
