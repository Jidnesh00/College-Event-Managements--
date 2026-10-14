import { Response } from 'express';
import { query, execute } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/.test(trimmed);
}

export function isValidAge(age: any): boolean {
  if (age === null || age === undefined || age === '') return false;
  const num = Number(age);
  return !isNaN(num) && Number.isInteger(num) && num >= 15 && num <= 60;
}

export const VALID_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
export const VALID_YEARS_OF_STUDY = ['1st', '2nd', '3rd', '4th'] as const;

export function calculateCompletion(data: {
  name?: string;
  phone?: string;
  age?: any;
  gender?: string;
  college_name?: string;
  department?: string;
  year_of_study?: string;
  roll_number?: string;
}) {
  const checks = [
    Boolean(data.name && data.name.trim()),
    isValidAge(data.age),
    Boolean(data.gender && VALID_GENDERS.includes(data.gender as any)),
    isValidPhoneNumber(data.phone || ''),
    Boolean(data.college_name && data.college_name.trim()),
    Boolean(data.department && data.department.trim()),
    Boolean(data.year_of_study && VALID_YEARS_OF_STUDY.includes(data.year_of_study as any)),
    Boolean(data.roll_number && data.roll_number.trim()),
  ];

  const filledCount = checks.filter(Boolean).length;
  const completionPercentage = Math.round((filledCount / checks.length) * 100);
  const isComplete = filledCount === checks.length;

  return { isComplete, completionPercentage, filledCount, totalFields: checks.length };
}

/**
 * GET student profile for the logged in student
 * A student can only read their own profile.
 */
export async function getStudentProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only student accounts have a student profile.' });
    }

    const users = await query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];
    const profiles = await query('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
    const profile = profiles[0] || null;

    const dataForCompletion = {
      name: user.name || '',
      phone: user.phone || '',
      age: profile?.age ?? '',
      gender: profile?.gender ?? '',
      college_name: profile?.college_name ?? '',
      department: profile?.department ?? '',
      year_of_study: profile?.year_of_study ?? '',
      roll_number: profile?.roll_number ?? '',
    };

    const { isComplete, completionPercentage } = calculateCompletion(dataForCompletion);

    return res.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        age: profile?.age ?? '',
        gender: profile?.gender ?? '',
        college_name: profile?.college_name ?? '',
        department: profile?.department ?? '',
        year_of_study: profile?.year_of_study ?? '',
        roll_number: profile?.roll_number ?? '',
        is_complete: isComplete,
        completion_percentage: completionPercentage,
      },
    });
  } catch (error: any) {
    console.error('[Get Student Profile Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student profile.' });
  }
}

/**
 * PUT student profile for the logged in student
 * Validates all required fields, age between 15-60, valid phone.
 */
export async function updateStudentProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only student accounts can update student profile.' });
    }

    const {
      name,
      age,
      gender,
      phone,
      college_name,
      department,
      year_of_study,
      roll_number,
    } = req.body;

    // 1. Validation - Personal section
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    if (!isValidAge(age)) {
      return res.status(400).json({ success: false, message: 'Age is required and must be a number between 15 and 60.' });
    }

    if (!gender || !VALID_GENDERS.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender is required and must be Male, Female, Other, or Prefer not to say.',
      });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (at least 7-15 digits with valid country code format).',
      });
    }

    // 2. Validation - Academic section
    if (!college_name || typeof college_name !== 'string' || !college_name.trim()) {
      return res.status(400).json({ success: false, message: 'College name is required.' });
    }

    if (!department || typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({ success: false, message: 'Branch / Department is required.' });
    }

    if (!year_of_study || !VALID_YEARS_OF_STUDY.includes(year_of_study)) {
      return res.status(400).json({
        success: false,
        message: 'Year of study is required and must be 1st, 2nd, 3rd, or 4th.',
      });
    }

    if (!roll_number || typeof roll_number !== 'string' || !roll_number.trim()) {
      return res.status(400).json({ success: false, message: 'Roll number / PRN is required.' });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const parsedAge = Number(age);
    const trimmedCollege = college_name.trim();
    const trimmedDept = department.trim();
    const trimmedRoll = roll_number.trim();

    // Update users table (name and phone)
    await execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [
      trimmedName,
      trimmedPhone,
      req.user.id,
    ]);

    // Check if student profile exists
    const existing = await query('SELECT id FROM student_profiles WHERE user_id = ?', [req.user.id]);
    if (existing.length > 0) {
      await execute(`
        UPDATE student_profiles SET
          age = ?,
          gender = ?,
          college_name = ?,
          department = ?,
          year_of_study = ?,
          roll_number = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        parsedAge,
        gender,
        trimmedCollege,
        trimmedDept,
        year_of_study,
        trimmedRoll,
        req.user.id,
      ]);
    } else {
      await execute(`
        INSERT INTO student_profiles (
          user_id, age, gender, college_name, department, year_of_study, roll_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.id,
        parsedAge,
        gender,
        trimmedCollege,
        trimmedDept,
        year_of_study,
        trimmedRoll,
      ]);
    }

    // Fetch user email
    const users = await query('SELECT email FROM users WHERE id = ?', [req.user.id]);
    const email = users[0]?.email || '';

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: {
        name: trimmedName,
        email,
        phone: trimmedPhone,
        age: parsedAge,
        gender,
        college_name: trimmedCollege,
        department: trimmedDept,
        year_of_study,
        roll_number: trimmedRoll,
        is_complete: true,
        completion_percentage: 100,
      },
    });
  } catch (error: any) {
    console.error('[Update Student Profile Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update student profile.' });
  }
}
