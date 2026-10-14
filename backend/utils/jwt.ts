import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'college_event_mgmt_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '7d';

export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'organizer' | 'admin';
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}
