import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';

export type AppRole = 'admin' | 'analyst';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: number; name: string; role: AppRole }, opts?: jwt.SignOptions): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', ...opts });
}

export function verifyToken(token: string): { userId: number; name: string; role: AppRole } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (!decoded || typeof decoded !== 'object') return null;
    const role = String(decoded.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'analyst') return null;
    return { userId: Number(decoded.userId), name: String(decoded.name), role };
  } catch {
    return null;
  }
}

export function getAuth(req: Request): { userId?: number; name?: string; role: AppRole } {
  const authHeader = String(req.header('authorization') || req.header('Authorization') || '');
  const m = authHeader.match(/^Bearer\s+(.+)/i);
  if (m) {
    const parsed = verifyToken(m[1]);
    if (parsed) return parsed;
  }
  // Fallback role resolution (no token):
  // 1) x-role header (admin/analyst)
  // 2) DEFAULT_ROLE env (admin/analyst)
  // 3) default to analyst
  const fallbackRoleHeader = String(req.header('x-role') || '').toLowerCase();
  const envDefaultRole = String(process.env.DEFAULT_ROLE || '').toLowerCase();
  const roleStr = (fallbackRoleHeader || envDefaultRole || 'analyst');
  const role: AppRole = roleStr === 'admin' ? 'admin' : 'analyst';
  return { role };
}
