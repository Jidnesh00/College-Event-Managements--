import { Response } from 'express';
import { query, execute } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  createAndSendNotification,
  broadcastToEventAttendees,
  checkUpcomingEventReminders,
  broadcastUnreadCount,
  getUnreadNotificationCount,
} from '../services/websocketService.js';

/**
 * Retrieve notifications for the authenticated user
 */
export async function getMyNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userId = req.user.id;
    const { type, unread_only } = req.query;

    let sql = `
      SELECT 
        n.*,
        e.title AS event_title,
        e.date AS event_date,
        e.date_tbd,
        e.end_date,
        e.start_time,
        e.venue AS event_venue
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.id
      WHERE n.user_id = ?
    `;
    const params: any[] = [userId];

    if (type && typeof type === 'string') {
      sql += ' AND n.type = ?';
      params.push(type);
    }

    if (unread_only === 'true') {
      sql += ' AND n.is_read = 0';
    }

    sql += ' ORDER BY n.created_at DESC LIMIT 50';

    const notifications = await query(sql, params);
    const unreadCount = await getUnreadNotificationCount(userId);

    return res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications: notifications.map((n) => ({
        ...n,
        is_read: Boolean(n.is_read),
      })),
    });
  } catch (error: any) {
    console.error('[Get Notifications Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id } = req.params;
    const userId = req.user.id;

    await execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    await broadcastUnreadCount(userId);

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error: any) {
    console.error('[Mark Read Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification status.' });
  }
}

/**
 * Mark all notifications for the current user as read
 */
export async function markAllAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userId = req.user.id;

    await execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    await broadcastUnreadCount(userId);

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('[Mark All Read Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id } = req.params;
    const userId = req.user.id;

    await execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    await broadcastUnreadCount(userId);

    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (error: any) {
    console.error('[Delete Notification Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
}

/**
 * Trigger an automatic scanner for upcoming events registered by the student
 */
export async function triggerUpcomingReminders(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    await checkUpcomingEventReminders(req.user.id);

    return res.json({
      success: true,
      message: 'Upcoming event reminders scanned and synced in real-time.',
    });
  } catch (error: any) {
    console.error('[Trigger Reminders Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to scan event reminders.' });
  }
}

/**
 * Instant test alert generator - allows student or tester to receive a live alert in real time!
 */
export async function sendTestNotification(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { type = 'reminder', title, message, event_id } = req.body;
    const userId = req.user.id;

    // Default test messages based on type
    const defaultTitle = type === 'reminder'
      ? '⏰ Live Reminder: HackFest 2026 starts in 2 hours!'
      : 'Status Update: Check-in verified at Mechanical Workshop Arena';

    const defaultMessage = type === 'reminder'
      ? 'Don\'t forget your laptop and college ID badge. Gates open at 8:30 AM at Main Auditorium!'
      : 'Your registration status has been updated to Confirmed. Pass #1 is validated.';

    const notification = await createAndSendNotification({
      userId,
      type: type as any,
      title: title || defaultTitle,
      message: message || defaultMessage,
      eventId: event_id || 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Real-time test alert dispatched via WebSocket!',
      notification,
    });
  } catch (error: any) {
    console.error('[Send Test Notification Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to send test notification.' });
  }
}

/**
 * Organizer / Admin broadcast an announcement or reminder to all attendees of an event
 */
export async function broadcastEventAnnouncement(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    // Verify organizer owns this event or is admin
    const eventRows = await query('SELECT * FROM events WHERE id = ?', [id]);
    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = eventRows[0];
    if (req.user.role !== 'admin' && Number(event.organizer_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to broadcast alerts for this event.' });
    }

    const result = await broadcastToEventAttendees(Number(id), {
      type: 'reminder',
      title: `📣 ${title} (${event.title})`,
      message,
    });

    return res.json({
      success: true,
      message: `Alert broadcasted successfully in real-time to ${result.count} registered attendee(s).`,
      recipientCount: result.count,
    });
  } catch (error: any) {
    console.error('[Broadcast Announcement Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to broadcast event announcement.' });
  }
}
