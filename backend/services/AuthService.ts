import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { signToken } from '../utils/jwt';
import { User } from '../types/api';

const users: User[] = [];
const refreshTokens = new Map<string, string>();

export class AuthService {
  static async register(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = { id: uuid(), email, passwordHash };
    users.push(user);
    return user;
  }

  static async authenticate(email: string, password: string): Promise<string | null> {
    const user = users.find(u => u.email === email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return null;
    const token = signToken({ id: user.id });
    refreshTokens.set(user.id, token);
    return token;
  }

  static refresh(userId: string): string | null {
    if (!refreshTokens.has(userId)) return null;
    const token = signToken({ id: userId });
    refreshTokens.set(userId, token);
    return token;
  }

  static logout(userId: string): void {
    refreshTokens.delete(userId);
  }
}
