import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventParticipants,
  updateAttendance,
  verifyTicket,
  confirmCheckIn,
  getOrganizerAnalytics,
  getEventMedia,
  uploadEventMedia,
  deleteEventMedia,
  setPrimaryBanner,
} from '../controllers/eventController.js';
import { authenticate, optionalAuth, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Organizer Registration Analytics & Trends
router.get('/organizer/analytics', authenticate, authorizeRoles('organizer', 'admin'), getOrganizerAnalytics);

// Event Media & Gallery: Public get, Organizer/Admin uploads & management
router.get('/:id/media', optionalAuth, getEventMedia);
router.post('/:id/media', authenticate, authorizeRoles('organizer', 'admin'), uploadEventMedia);
router.delete('/:id/media/:mediaId', authenticate, authorizeRoles('organizer', 'admin'), deleteEventMedia);
router.patch('/:id/media/:mediaId/banner', authenticate, authorizeRoles('organizer', 'admin'), setPrimaryBanner);

// Public / student browsable events
router.get('/', optionalAuth, getAllEvents);
router.get('/:id', optionalAuth, getEventById);

// Event creation & management: Students, Organizers and Admins
router.post('/', authenticate, authorizeRoles('student', 'organizer', 'admin'), createEvent);
router.put('/:id', authenticate, authorizeRoles('student', 'organizer', 'admin'), updateEvent);
router.delete('/:id', authenticate, authorizeRoles('student', 'organizer', 'admin'), deleteEvent);

// Participant roster & Attendance management
router.get('/:id/participants', authenticate, authorizeRoles('organizer', 'admin'), getEventParticipants);
router.patch('/:id/attendance/:registrationId', authenticate, authorizeRoles('organizer', 'admin'), updateAttendance);

// QR Ticket verification and Instant Check-in for entry gates
router.post('/:id/verify-ticket', authenticate, authorizeRoles('organizer', 'admin'), verifyTicket);
router.post('/:id/checkin/:registrationId', authenticate, authorizeRoles('organizer', 'admin'), confirmCheckIn);

export default router;
