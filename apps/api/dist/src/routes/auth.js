"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
const SignupSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'name_min_2').max(64),
    password: zod_1.z.string().min(2, 'password_min_2').max(128),
    role: zod_1.z.enum(['admin', 'analyst']).optional().default('analyst'),
});
const LoginSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'name_min_2').max(64),
    password: zod_1.z.string().min(2, 'password_min_2').max(128),
    // If true and user doesn't exist, create it with provided role (default analyst)
    createIfNotExists: zod_1.z.boolean().optional().default(false),
    role: zod_1.z.enum(['admin', 'analyst']).optional().default('analyst'),
});
router.post('/signup', async (req, res) => {
    try {
        const { name, password, role } = SignupSchema.parse(req.body || {});
        const exists = await prisma_1.prisma.user.findUnique({ where: { name } });
        if (exists)
            return res.status(409).json({ error: 'user_exists' });
        const passwordHash = await (0, auth_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({ data: { name, passwordHash, role: role.toUpperCase() } });
        const token = (0, auth_1.signToken)({ userId: user.id, name: user.name, role });
        return res.json({ token, role });
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: 'invalid_body', issues: e.issues });
        console.error(e);
        return res.status(500).json({ error: 'signup_failed' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { name, password, createIfNotExists, role } = LoginSchema.parse(req.body || {});
        let user = await prisma_1.prisma.user.findUnique({ where: { name } });
        if (!user) {
            if (createIfNotExists) {
                const passwordHash = await (0, auth_1.hashPassword)(password);
                user = await prisma_1.prisma.user.create({ data: { name, passwordHash, role: role.toUpperCase() } });
            }
            else {
                return res.status(404).json({ error: 'user_not_found' });
            }
        }
        const ok = await (0, auth_1.verifyPassword)(password, user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: 'invalid_credentials' });
        // If requested, update existing user's role to the selected role (promote/demote)
        let effectiveRole = String(user.role).toLowerCase();
        if (createIfNotExists && role !== effectiveRole) {
            user = await prisma_1.prisma.user.update({ where: { id: user.id }, data: { role: role.toUpperCase() } });
            effectiveRole = role;
        }
        const token = (0, auth_1.signToken)({ userId: user.id, name: user.name, role: effectiveRole });
        return res.json({ token, role: effectiveRole });
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: 'invalid_body', issues: e.issues });
        console.error(e);
        return res.status(500).json({ error: 'login_failed' });
    }
});
exports.default = router;
