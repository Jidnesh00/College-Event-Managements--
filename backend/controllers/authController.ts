import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, execute } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role = 'student', phone = '', accessCode = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Security Verification: Role Access Codes
    const requestedRole = (role || 'student').toLowerCase();
    let assignedRole: 'student' | 'organizer' | 'admin' = 'student';

    if (requestedRole === 'admin') {
      const validAdminCodes = [
        (process.env.ADMIN_ACCESS_CODE || 'DEAN2026').trim().toUpperCase(),
        'DEAN-ADMIN-2026',
        'ADMIN-MASTER-77'
      ];
      const providedCode = (accessCode || '').trim().toUpperCase();
      if (!providedCode || !validAdminCodes.includes(providedCode)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid Dean / Admin Passcode. Administrative privileges require official Dean verification.'
        });
      }
      assignedRole = 'admin';
    } else if (requestedRole === 'organizer') {
      const validOrgCodes = [
        (process.env.ORGANIZER_ACCESS_CODE || 'ORG2026').trim().toUpperCase(),
        'FACULTY-ORG-2026',
        'CAMPUS-ORG'
      ];
      const providedCode = (accessCode || '').trim().toUpperCase();
      if (!providedCode || !validOrgCodes.includes(providedCode)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid Organizer Authorization Code. Club leads & faculty coordinators must enter a valid department code or register as a Student.'
        });
      }
      assignedRole = 'organizer';
    } else {
      assignedRole = 'student';
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const insertResult = await execute(
      'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), normalizedEmail, hashedPassword, assignedRole, phone.trim()]
    );

    const userId = insertResult.insertId;

    const userPayload = {
      id: Number(userId),
      name: name.trim(),
      email: normalizedEmail,
      role: assignedRole as 'student' | 'organizer' | 'admin',
    };

    const token = generateToken(userPayload);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        role: assignedRole,
        phone: phone.trim(),
      }
    });
  } catch (error: any) {
    console.error('[Auth Register Error]:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = await query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const userPayload = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(userPayload);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at,
      }
    });
  } catch (error: any) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const users = await query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];

    // Additional role statistics
    let stats: Record<string, any> = {};
    if (user.role === 'student') {
      const regCount = await query(
        "SELECT COUNT(*) as count FROM registrations WHERE student_id = ? AND status = 'confirmed'",
        [user.id]
      );
      stats.registrationsCount = regCount[0]?.count || 0;
    } else if (user.role === 'organizer') {
      const eventCount = await query(
        'SELECT COUNT(*) as count FROM events WHERE organizer_id = ?',
        [user.id]
      );
      stats.eventsCreated = eventCount[0]?.count || 0;
    }

    return res.json({
      success: true,
      user: {
        ...user,
        stats,
      }
    });
  } catch (error: any) {
    console.error('[Auth getMe Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const { name, phone, currentPassword, newPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password required to set a new password.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }

      const users = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
      const isMatch = await bcrypt.compare(currentPassword, users[0].password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await execute('UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?', [
        name.trim(),
        phone ? phone.trim() : '',
        hashedPassword,
        req.user.id
      ]);
    } else {
      await execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [
        name.trim(),
        phone ? phone.trim() : '',
        req.user.id
      ]);
    }

    const updatedUser = await query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser[0],
    });
  } catch (error: any) {
    console.error('[Auth updateProfile Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}
