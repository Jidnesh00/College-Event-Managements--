import { Router } from 'express';
import { getStudentProfile, updateStudentProfile } from '../controllers/studentController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Student Profile endpoints - restricted to authenticated student for their own profile
router.get('/profile', authenticate, authorizeRoles('student'), getStudentProfile);
router.put('/profile', authenticate, authorizeRoles('student'), updateStudentProfile);

export default router;
