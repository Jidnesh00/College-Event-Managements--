import { Router } from 'express';
import {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  updateFormStatus,
} from '../controllers/registrationController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Student registers for an event
router.post('/', authenticate, authorizeRoles('student'), registerForEvent);

// Student views their own registrations
router.get('/my', authenticate, authorizeRoles('student'), getMyRegistrations);

// Student updates their Google Form completed status
router.patch('/:id/form-status', authenticate, authorizeRoles('student', 'organizer', 'admin'), updateFormStatus);

// Student or Admin cancels a registration
router.delete('/:id', authenticate, authorizeRoles('student', 'admin'), cancelRegistration);

export default router;

