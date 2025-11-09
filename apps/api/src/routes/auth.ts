import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, signToken, verifyPassword } from '../lib/auth';

const router = Router();

const SignupSchema = z.object({
  name: z.string().trim().min(2, 'name_min_2').max(64),
  password: z.string().min(2, 'password_min_2').max(128),
  role: z.enum(['admin', 'analyst']).optional().default('analyst'),
});

const LoginSchema = z.object({
  name: z.string().trim().min(2, 'name_min_2').max(64),
  password: z.string().min(2, 'password_min_2').max(128),
  // If true and user doesn't exist, create it with provided role (default analyst)
  createIfNotExists: z.boolean().optional().default(false),
  role: z.enum(['admin', 'analyst']).optional().default('analyst'),
});

router.post('/signup', async (req, res) => {
  try {
    const { name, password, role } = SignupSchema.parse(req.body || {});
    const exists = await prisma.user.findUnique({ where: { name } });
    if (exists) return res.status(409).json({ error: 'user_exists' });
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { name, passwordHash, role: role.toUpperCase() as any } });
    const token = signToken({ userId: user.id, name: user.name, role });
    return res.json({ token, role });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'invalid_body', issues: e.issues });
    console.error(e);
    return res.status(500).json({ error: 'signup_failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { name, password, createIfNotExists, role } = LoginSchema.parse(req.body || {});
    let user = await prisma.user.findUnique({ where: { name } });
    if (!user) {
      if (createIfNotExists) {
        const passwordHash = await hashPassword(password);
        user = await prisma.user.create({ data: { name, passwordHash, role: role.toUpperCase() as any } });
      } else {
        return res.status(404).json({ error: 'user_not_found' });
      }
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    // If requested, update existing user's role to the selected role (promote/demote)
    let effectiveRole = String(user.role).toLowerCase() as 'admin' | 'analyst';
    if (createIfNotExists && role !== effectiveRole) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: role.toUpperCase() as any } });
      effectiveRole = role;
    }

    const token = signToken({ userId: user.id, name: user.name, role: effectiveRole });
    return res.json({ token, role: effectiveRole });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'invalid_body', issues: e.issues });
    console.error(e);
    return res.status(500).json({ error: 'login_failed' });
  }
});

export default router;
