import { Router, Response } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { getStudentProfile, updateStudentProfile } from '../controllers/studentController.js';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'student') {
    return getStudentProfile(req, res);
  }
  return getMe(req, res);
});
router.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'student') {
    return updateStudentProfile(req, res);
  }
  return updateProfile(req, res);
});

export default router;
