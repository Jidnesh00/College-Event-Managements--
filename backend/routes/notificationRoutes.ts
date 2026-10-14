import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  triggerUpcomingReminders,
  sendTestNotification,
  broadcastEventAnnouncement,
} from '../controllers/notificationController.js';

const router = Router();

// Student / User notifications routes (All protected by JWT auth)
router.get('/', authenticate, getMyNotifications);
router.patch('/read-all', authenticate, markAllAsRead);
router.patch('/:id/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);
router.post('/check-reminders', authenticate, triggerUpcomingReminders);
router.post('/test', authenticate, sendTestNotification);

// Organizer / Admin event broadcast alert
router.post('/events/:id/broadcast', authenticate, authorizeRoles('organizer', 'admin'), broadcastEventAnnouncement);

export default router;
