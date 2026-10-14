import { Response } from 'express';
import { query, execute } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createAndSendNotification } from '../services/websocketService.js';

/**
 * Register current logged-in student for an event
 */
export async function registerForEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Please log in to register for this event.' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can register for events. Organizers and Admins manage events.'
      });
    }

    const { event_id } = req.body;
    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const studentId = req.user.id;

    // 1. Check if event exists and is approved
    const eventRows = await query('SELECT * FROM events WHERE id = ?', [event_id]);
    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = eventRows[0];
    if (event.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot register for this event. Event status is ${event.status}.`
      });
    }

    // 2. Check registration deadline (if set)
    if (event.registration_deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(event.registration_deadline);
      deadline.setHours(23, 59, 59, 999);

      if (today > deadline) {
        return res.status(400).json({
          success: false,
          message: 'Registration is closed. The deadline for this event has passed.'
        });
      }
    }

    // 3. Check for existing registration
    const existing = await query(
      'SELECT id, status FROM registrations WHERE student_id = ? AND event_id = ?',
      [studentId, event_id]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'confirmed') {
        return res.status(409).json({
          success: false,
          message: 'You are already registered for this event.'
        });
      } else {
        // If previously cancelled, allow re-registration
        await execute(
          "UPDATE registrations SET status = 'confirmed', registration_date = CURRENT_TIMESTAMP WHERE id = ?",
          [existing[0].id]
        );

        // Real-time notification for student
        createAndSendNotification({
          userId: studentId,
          type: 'registration_status',
          title: 'Registration Reactivated 🎉',
          message: `Your registration for "${event.title}" has been reactivated. Pass #${existing[0].id} is valid.`,
          eventId: event.id,
        }).catch((err) => console.error('[Notification Error]:', err));

        return res.json({
          success: true,
          message: 'Registration reactivated successfully!',
          registrationId: existing[0].id,
        });
      }
    }

    // 4. Check seat capacity (NULL means unlimited seats)
    const hasSeatLimit = event.max_participants !== null && event.max_participants !== undefined && event.max_participants !== '';
    if (hasSeatLimit) {
      const regCountRows = await query(
        "SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status = 'confirmed'",
        [event_id]
      );
      const confirmedCount = regCountRows[0]?.count || 0;

      if (confirmedCount >= Number(event.max_participants)) {
        return res.status(400).json({
          success: false,
          message: 'This event has reached maximum capacity. No seats available.'
        });
      }
    }

    // 5. Insert registration
    const insertResult = await execute(
      "INSERT INTO registrations (student_id, event_id, status, attendance_status) VALUES (?, ?, 'confirmed', 'unmarked')",
      [studentId, event_id]
    );

    // Real-time notification for student
    const dateText = event.date_tbd ? 'Date TBD' : (event.date || 'TBD');
    createAndSendNotification({
      userId: studentId,
      type: 'registration_status',
      title: 'Registration Confirmed 🎉',
      message: `You are registered for "${event.title}". Venue: ${event.venue}. Date: ${dateText}. Your QR Pass #${insertResult.insertId} is now active.`,
      eventId: event.id,
    }).catch((err) => console.error('[Notification Error]:', err));

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You have secured your seat.',
      registrationId: insertResult.insertId,
      google_form_url: event.google_form_url || null,
      event_title: event.title,
    });
  } catch (error: any) {
    console.error('[Registration Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to process event registration.' });
  }
}

/**
 * Get all registrations of the logged-in student
 */
export async function getMyRegistrations(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const studentId = req.user.id;

    const registrations = await query(`
      SELECT 
        r.id AS registration_id,
        r.registration_date,
        r.status AS registration_status,
        r.attendance_status,
        r.google_form_completed,
        e.id AS event_id,
        e.title,
        e.description,
        e.date,
        e.date_tbd,
        e.end_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.max_participants,
        e.image,
        e.google_form_url,
        e.status AS event_status,
        c.name AS category_name,
        u.name AS organizer_name,
        u.email AS organizer_email
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.organizer_id = u.id
      WHERE r.student_id = ?
      ORDER BY r.registration_date DESC
    `, [studentId]);

    return res.json({ success: true, count: registrations.length, registrations });
  } catch (error: any) {
    console.error('[Get My Registrations Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve registrations.' });
  }
}

/**
 * Cancel a student registration
 */
export async function cancelRegistration(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id } = req.params;

    const rows = await query(`
      SELECT r.*, e.date, e.date_tbd, e.end_date, e.title AS event_title 
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    const registration = rows[0];

    // Only the student themselves or an admin can cancel
    if (req.user.role !== 'admin' && Number(registration.student_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this registration.' });
    }

    // Check if event has already occurred (if not TBD and date is present)
    if (!registration.date_tbd && registration.date && req.user.role !== 'admin') {
      const compareDate = registration.end_date || registration.date;
      const eventDate = new Date(compareDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel registration for an event that has already taken place.'
        });
      }
    }

    await execute("UPDATE registrations SET status = 'cancelled' WHERE id = ?", [id]);

    // Dispatch real-time cancellation notification
    createAndSendNotification({
      userId: registration.student_id,
      type: 'registration_status',
      title: 'Registration Cancelled',
      message: `Your registration for "${registration.event_title}" has been cancelled.`,
      eventId: registration.event_id,
    }).catch((err) => console.error('[Notification Error]:', err));

    return res.json({ success: true, message: 'Registration cancelled successfully.' });
  } catch (error: any) {
    console.error('[Cancel Registration Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel registration.' });
  }
}

/**
 * Update Google Form submission status for a student registration
 */
export async function updateFormStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { id } = req.params;
    const { completed } = req.body;

    const rows = await query(`
      SELECT r.*, e.title AS event_title, e.google_form_url
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    const reg = rows[0];

    // Only the student themselves or admin/organizer can update form status
    if (req.user.role !== 'admin' && Number(reg.student_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this registration form status.' });
    }

    const completedVal = completed ? 1 : 0;
    await execute('UPDATE registrations SET google_form_completed = ? WHERE id = ?', [completedVal, id]);

    return res.json({
      success: true,
      message: completedVal === 1 ? 'Google Form marked as submitted!' : 'Google Form status updated.',
      completed: completedVal === 1,
      registrationId: Number(id),
    });
  } catch (error: any) {
    console.error('[Update Form Status Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update Google Form status.' });
  }
}

