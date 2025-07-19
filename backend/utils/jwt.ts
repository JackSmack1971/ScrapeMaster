import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '24h';

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
