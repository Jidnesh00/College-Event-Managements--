import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { verifyToken, UserPayload } from '../utils/jwt.js';
import { query, execute } from '../config/db.js';

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: number;
  userRole?: string;
  userName?: string;
}

// User ID to active WebSocket connections
const userConnections = new Map<number, Set<ExtendedWebSocket>>();

let wss: WebSocketServer | null = null;

export interface NotificationPayload {
  userId: number;
  type: 'reminder' | 'registration_status' | 'event_update' | 'general';
  title: string;
  message: string;
  eventId?: number | null;
}

/**
 * Initializes the WebSocket server attached to the HTTP server
 */
export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  console.log('[WebSocket] Real-time notification WebSocket server initialized on path /ws');

  // Heartbeat interval to check alive connections every 30 seconds
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', async (ws: ExtendedWebSocket, req) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Extract token from query parameters: /ws?token=...
    const reqUrl = req.url || '';
    const queryParams = new URLSearchParams(reqUrl.includes('?') ? reqUrl.substring(reqUrl.indexOf('?') + 1) : '');
    const token = queryParams.get('token');

    let authenticatedUser: UserPayload | null = null;
    if (token) {
      authenticatedUser = verifyToken(token);
    }

    if (authenticatedUser) {
      bindUserToSocket(ws, authenticatedUser);
    } else {
      // Allow unauthenticated connection temporarily, waiting for an 'auth' message
      safeSend(ws, {
        type: 'auth:required',
        message: 'Send { type: "auth", token: "..." } to authenticate real-time notification stream.',
      });
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'auth' && msg.token) {
          const user = verifyToken(msg.token);
          if (user) {
            bindUserToSocket(ws, user);
          } else {
            safeSend(ws, { type: 'auth:failed', message: 'Invalid or expired authentication token.' });
          }
        } else if (msg.type === 'ping') {
          safeSend(ws, { type: 'pong', timestamp: Date.now() });
        } else if (msg.type === 'check_reminders' && ws.userId) {
          await checkUpcomingEventReminders(ws.userId);
        }
      } catch (err) {
        console.warn('[WebSocket Message Error]:', err);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        const userSockets = userConnections.get(ws.userId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            userConnections.delete(ws.userId);
          }
        }
      }
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket Client Error]:', err.message);
    });
  });

  return wss;
}

/**
 * Binds an authenticated user to their active socket and sends initial sync state
 */
async function bindUserToSocket(ws: ExtendedWebSocket, user: UserPayload) {
  ws.userId = user.id;
  ws.userRole = user.role;
  ws.userName = user.name;

  if (!userConnections.has(user.id)) {
    userConnections.set(user.id, new Set());
  }
  userConnections.get(user.id)!.add(ws);

  console.log(`[WebSocket] User #${user.id} (${user.name}) connected to real-time notification channel.`);

  // Send connection ack
  safeSend(ws, {
    type: 'connection:established',
    user: { id: user.id, name: user.name, role: user.role },
    connectedAt: new Date().toISOString(),
  });

  // Send current unread count & initial recent notifications
  try {
    const unreadCount = await getUnreadNotificationCount(user.id);
    const recent = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15',
      [user.id]
    );

    safeSend(ws, {
      type: 'notifications:init',
      unreadCount,
      notifications: recent,
    });

    // Also run an automatic reminder check for this user's upcoming events
    if (user.role === 'student') {
      setTimeout(() => {
        checkUpcomingEventReminders(user.id).catch(() => {});
      }, 1000);
    }
  } catch (err) {
    console.error('[WebSocket Init State Error]:', err);
  }
}

/**
 * Safely stringifies and sends a JSON payload to a socket
 */
function safeSend(ws: WebSocket, payload: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Gets count of unread notifications for a user
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const rows = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return rows[0]?.count || 0;
}

/**
 * Persists a notification to the database and dispatches it in real-time over WebSocket
 */
export async function createAndSendNotification(payload: NotificationPayload) {
  try {
    const { userId, type, title, message, eventId = null } = payload;

    const result = await execute(
      `INSERT INTO notifications (user_id, type, title, message, event_id, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, type, title, message, eventId]
    );

    const insertedRows = await query('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
    const notification = insertedRows[0] || {
      id: result.insertId,
      user_id: userId,
      type,
      title,
      message,
      event_id: eventId,
      is_read: 0,
      created_at: new Date().toISOString(),
    };

    const unreadCount = await getUnreadNotificationCount(userId);

    // Push in real-time to all active connections for this user
    const sockets = userConnections.get(userId);
    if (sockets && sockets.size > 0) {
      const messagePacket = JSON.stringify({
        type: 'notification:new',
        notification,
        unreadCount,
      });

      sockets.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(messagePacket);
        }
      });
      console.log(`[WebSocket] Real-time notification delivered to User #${userId}: "${title}"`);
    } else {
      console.log(`[WebSocket] Notification saved to database for User #${userId} (user currently offline)`);
    }

    return notification;
  } catch (error) {
    console.error('[Create & Send Notification Error]:', error);
    throw error;
  }
}

/**
 * Broadcasts an event announcement/reminder to all confirmed student attendees
 */
export async function broadcastToEventAttendees(
  eventId: number,
  notificationData: { type?: 'reminder' | 'event_update'; title: string; message: string }
) {
  try {
    const attendees = await query(
      "SELECT student_id FROM registrations WHERE event_id = ? AND status = 'confirmed'",
      [eventId]
    );

    const type = notificationData.type || 'reminder';
    const promises = attendees.map((a: any) =>
      createAndSendNotification({
        userId: a.student_id,
        type,
        title: notificationData.title,
        message: notificationData.message,
        eventId,
      })
    );

    await Promise.all(promises);
    return { count: attendees.length };
  } catch (error) {
    console.error('[Broadcast Event Attendees Error]:', error);
    throw error;
  }
}

/**
 * Checks for upcoming events scheduled for the student (e.g. today or in the next 3 days)
 * and generates reminder notifications if they have not already received one for that event.
 */
export async function checkUpcomingEventReminders(targetUserId?: number) {
  try {
    let sql = `
      SELECT 
        r.student_id,
        e.id AS event_id,
        e.title AS event_title,
        e.date AS event_date,
        e.start_time,
        e.venue,
        c.name AS category_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN categories c ON e.category_id = c.id
      WHERE r.status = 'confirmed'
        AND e.status = 'approved'
    `;
    const params: any[] = [];

    if (targetUserId) {
      sql += ' AND r.student_id = ?';
      params.push(targetUserId);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    sql += ' AND e.date_tbd = 0 AND e.date IS NOT NULL AND e.date >= ? ORDER BY e.date ASC';
    params.push(todayStr);

    const upcomingRegistrations = await query(sql, params);

    for (const reg of upcomingRegistrations) {
      // Check if a reminder notification for this event was already created for this user
      const existingReminders = await query(
        "SELECT id FROM notifications WHERE user_id = ? AND event_id = ? AND type = 'reminder'",
        [reg.student_id, reg.event_id]
      );

      if (existingReminders.length === 0) {
        // Formulate friendly upcoming reminder
        const eventDateFormatted = reg.event_date
          ? new Date(reg.event_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Date TBD';
        const timeText = reg.start_time ? ` at ${reg.start_time}` : '';

        await createAndSendNotification({
          userId: reg.student_id,
          type: 'reminder',
          title: `⏰ Reminder: ${reg.event_title} is coming up!`,
          message: `Your registered event "${reg.event_title}" is scheduled on ${eventDateFormatted}${timeText} (${reg.venue}). Have your digital QR Pass ready for check-in!`,
          eventId: reg.event_id,
        });
      }
    }
  } catch (error) {
    console.error('[Check Upcoming Event Reminders Error]:', error);
  }
}

/**
 * Broadcasts an unread count update to a user's active sockets
 */
export async function broadcastUnreadCount(userId: number) {
  const sockets = userConnections.get(userId);
  if (sockets && sockets.size > 0) {
    const unreadCount = await getUnreadNotificationCount(userId);
    const message = JSON.stringify({
      type: 'notification:unread_count',
      unreadCount,
    });
    sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(message);
      }
    });
  }
}
