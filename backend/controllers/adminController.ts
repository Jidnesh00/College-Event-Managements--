import { Response } from 'express';
import { query, execute } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { broadcastToEventAttendees, createAndSendNotification } from '../services/websocketService.js';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Basic Counts
    const [
      studentCount,
      organizerCount,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
      attendedCount,
      pendingCount,
    ] = await Promise.all([
      query("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
      query("SELECT COUNT(*) as count FROM users WHERE role = 'organizer'"),
      query("SELECT COUNT(*) as count FROM events"),
      query("SELECT COUNT(*) as count FROM events WHERE (date_tbd = 1 OR date >= ? OR (end_date IS NOT NULL AND end_date >= ?))", [today, today]),
      query("SELECT COUNT(*) as count FROM registrations WHERE status = 'confirmed'"),
      query("SELECT COUNT(*) as count FROM registrations WHERE attendance_status = 'present'"),
      query("SELECT COUNT(*) as count FROM events WHERE status = 'pending'"),
    ]);

    // Attendance Breakdown
    const attendanceStats = await query(`
      SELECT attendance_status, COUNT(*) as count 
      FROM registrations 
      WHERE status = 'confirmed'
      GROUP BY attendance_status
    `);

    // Category Distribution
    const categoryStats = await query(`
      SELECT c.name, COUNT(e.id) as count
      FROM categories c
      LEFT JOIN events e ON e.category_id = c.id
      GROUP BY c.id
      ORDER BY count DESC
    `);

    // Events by Status
    const statusStats = await query(`
      SELECT status, COUNT(*) as count
      FROM events
      GROUP BY status
    `);

    // Recent 5 Registrations
    const recentRegistrations = await query(`
      SELECT 
        r.id,
        r.registration_date,
        r.status,
        r.attendance_status,
        u.name as student_name,
        u.email as student_email,
        e.title as event_title,
        e.date as event_date,
        e.date_tbd,
        e.end_date,
        e.start_time,
        e.end_time
      FROM registrations r
      JOIN users u ON r.student_id = u.id
      JOIN events e ON r.event_id = e.id
      ORDER BY r.registration_date DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      stats: {
        totalStudents: studentCount[0]?.count || 0,
        totalOrganizers: organizerCount[0]?.count || 0,
        totalEvents: totalEvents[0]?.count || 0,
        upcomingEvents: upcomingEvents[0]?.count || 0,
        pendingEvents: pendingCount[0]?.count || 0,
        totalRegistrations: totalRegistrations[0]?.count || 0,
        attendedCount: attendedCount[0]?.count || 0,
        attendanceStats,
        categoryStats,
        statusStats,
        recentRegistrations,
      }
    });
  } catch (error: any) {
    console.error('[Admin Dashboard Stats Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin dashboard stats.' });
  }
}

export async function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const { role, q } = req.query;

    let sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        u.created_at,
        (CASE 
          WHEN u.role = 'student' THEN (SELECT COUNT(*) FROM registrations r WHERE r.student_id = u.id AND r.status = 'confirmed')
          WHEN u.role = 'organizer' THEN (SELECT COUNT(*) FROM events e WHERE e.organizer_id = u.id)
          ELSE 0
        END) AS activity_count
      FROM users u
      WHERE 1=1
    `;

    const params: any[] = [];
    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (q && typeof q === 'string' && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR u.phone LIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY u.created_at DESC';

    const users = await query(sql, params);
    return res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    console.error('[Admin Get Users Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    if (Number(id) === req.user?.id && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot revoke your own admin status.' });
    }

    await execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    return res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (error: any) {
    console.error('[Admin Update User Role Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user?.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const existing = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await execute('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ success: true, message: 'User account and associated records deleted.' });
  } catch (error: any) {
    console.error('[Admin Delete User Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
}

export async function updateEventStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    const existing = await query('SELECT id, title, status, organizer_id FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const prevStatus = existing[0].status;
    const eventTitle = existing[0].title;
    const organizerId = existing[0].organizer_id;
    await execute('UPDATE events SET status = ? WHERE id = ?', [status, id]);

    if (prevStatus !== status) {
      if (status === 'approved') {
        createAndSendNotification({
          userId: organizerId,
          type: 'event_update',
          title: 'Event Approved ✅',
          message: `Your event "${eventTitle}" has been approved by campus administration and is now live on the public calendar.`,
          eventId: Number(id),
        }).catch((err) => console.error('[Approve Notification Error]:', err));
      } else if (status === 'rejected') {
        createAndSendNotification({
          userId: organizerId,
          type: 'event_update',
          title: 'Event Proposal Declined',
          message: `Your event proposal "${eventTitle}" was not approved by campus administration. You can edit and resubmit it.`,
          eventId: Number(id),
        }).catch((err) => console.error('[Reject Notification Error]:', err));
      } else if (status === 'cancelled') {
        createAndSendNotification({
          userId: organizerId,
          type: 'event_update',
          title: '⚠️ Event Cancelled by Administration',
          message: `Your event "${eventTitle}" has been marked as cancelled by campus administration.`,
          eventId: Number(id),
        }).catch((err) => console.error('[Cancel Notification Organizer Error]:', err));

        broadcastToEventAttendees(Number(id), {
          type: 'event_update',
          title: `⚠️ Event Cancelled: ${eventTitle}`,
          message: `The event "${eventTitle}" has been cancelled by administration.`,
        }).catch((err) => console.error('[Admin Event Cancel Broadcast Error]:', err));
      } else {
        broadcastToEventAttendees(Number(id), {
          type: 'event_update',
          title: `Event Status: ${status.toUpperCase()}`,
          message: `The event "${eventTitle}" has been marked as ${status}. Check the event page for details.`,
        }).catch((err) => console.error('[Admin Event Update Broadcast Error]:', err));
      }
    }

    return res.json({ success: true, message: `Event status updated to ${status}.` });
  } catch (error: any) {
    console.error('[Admin Update Event Status Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update event status.' });
  }
}

/**
 * Approve a pending event proposal
 */
export async function approveEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    await execute("UPDATE events SET status = 'approved' WHERE id = ?", [id]);

    // Notify the organizer who created the event
    createAndSendNotification({
      userId: event.organizer_id,
      type: 'event_update',
      title: 'Event Approved ✅',
      message: `Your event "${event.title}" has been approved by campus administration and is now live on the public calendar.`,
      eventId: Number(id),
    }).catch((err) => console.error('[Approve Notification Error]:', err));

    return res.json({
      success: true,
      message: `Event "${event.title}" has been approved successfully.`,
    });
  } catch (error: any) {
    console.error('[Admin Approve Event Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve event.' });
  }
}

/**
 * Reject a pending event proposal with optional reason
 */
export async function rejectEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await query('SELECT * FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    const reasonClean = reason && typeof reason === 'string' && reason.trim() ? reason.trim() : null;
    await execute("UPDATE events SET status = 'rejected', rejection_reason = ? WHERE id = ?", [reasonClean, id]);

    const reasonText = reasonClean
      ? ` Reason: "${reasonClean}"`
      : '';

    // Notify organizer
    createAndSendNotification({
      userId: event.organizer_id,
      type: 'event_update',
      title: 'Event Proposal Declined',
      message: `Your event proposal "${event.title}" was not approved by campus administration.${reasonText} You can edit and resubmit it.`,
      eventId: Number(id),
    }).catch((err) => console.error('[Reject Notification Error]:', err));

    return res.json({
      success: true,
      message: `Event "${event.title}" has been rejected.`,
    });
  } catch (error: any) {
    console.error('[Admin Reject Event Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject event.' });
  }
}

/**
 * Cancel an approved event with optional reason
 * Cancelling hides it from public lists, keeps existing registrations, and notifies both organizer and students
 */
export async function cancelEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await query('SELECT * FROM events WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = existing[0];
    await execute("UPDATE events SET status = 'cancelled' WHERE id = ?", [id]);

    const reasonText = reason && typeof reason === 'string' && reason.trim()
      ? ` Reason: "${reason.trim()}"`
      : '';

    // Notify organizer
    createAndSendNotification({
      userId: event.organizer_id,
      type: 'event_update',
      title: '⚠️ Event Cancelled by Administration',
      message: `Your event "${event.title}" has been marked as cancelled by campus administration.${reasonText}`,
      eventId: Number(id),
    }).catch((err) => console.error('[Cancel Notification Organizer Error]:', err));

    // Notify all registered attendees
    broadcastToEventAttendees(Number(id), {
      type: 'event_update',
      title: `⚠️ Event Cancelled: ${event.title}`,
      message: `The event "${event.title}" has been cancelled by administration.${reasonText}`,
    }).catch((err) => console.error('[Cancel Notification Attendees Error]:', err));

    return res.json({
      success: true,
      message: `Event "${event.title}" cancelled successfully. Registered students and organizer have been notified.`,
    });
  } catch (error: any) {
    console.error('[Admin Cancel Event Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel event.' });
  }
}

/**
 * Get pending events count for badges
 */
export async function getPendingEventsCount(req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await query("SELECT COUNT(*) as count FROM events WHERE status = 'pending'");
    return res.json({ success: true, count: Number(rows[0]?.count || 0) });
  } catch (error: any) {
    console.error('[Admin Pending Count Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pending count.' });
  }
}

export async function getAllRegistrations(req: AuthenticatedRequest, res: Response) {
  try {
    const { event_id, status, attendance_status } = req.query;

    let sql = `
      SELECT 
        r.id AS registration_id,
        r.registration_date,
        r.status AS registration_status,
        r.attendance_status,
        r.google_form_completed,
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        e.id AS event_id,
        e.title AS event_title,
        e.date AS event_date,
        e.date_tbd,
        e.end_date,
        e.start_time,
        e.end_time,
        e.venue AS event_venue,
        e.google_form_url,
        c.name AS category_name
      FROM registrations r
      JOIN users u ON r.student_id = u.id
      JOIN events e ON r.event_id = e.id
      JOIN categories c ON e.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (event_id) {
      sql += ' AND r.event_id = ?';
      params.push(event_id);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (attendance_status) {
      sql += ' AND r.attendance_status = ?';
      params.push(attendance_status);
    }

    sql += ' ORDER BY r.registration_date DESC';

    const registrations = await query(sql, params);
    return res.json({ success: true, count: registrations.length, registrations });
  } catch (error: any) {
    console.error('[Admin Get All Registrations Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve registrations.' });
  }
}
