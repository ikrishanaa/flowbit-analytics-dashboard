"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.getAuth = getAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function getJwtSecret() {
    return process.env.JWT_SECRET || 'dev-secret-change-me';
}
async function hashPassword(password) {
    const salt = await bcryptjs_1.default.genSalt(10);
    return bcryptjs_1.default.hash(password, salt);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function signToken(payload, opts) {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), { expiresIn: '7d', ...opts });
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
        if (!decoded || typeof decoded !== 'object')
            return null;
        const role = String(decoded.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'analyst')
            return null;
        return { userId: Number(decoded.userId), name: String(decoded.name), role };
    }
    catch {
        return null;
    }
}
function getAuth(req) {
    const authHeader = String(req.header('authorization') || req.header('Authorization') || '');
    const m = authHeader.match(/^Bearer\s+(.+)/i);
    if (m) {
        const parsed = verifyToken(m[1]);
        if (parsed)
            return parsed;
    }
    // Fallback role resolution (no token):
    // 1) x-role header (admin/analyst)
    // 2) DEFAULT_ROLE env (admin/analyst)
    // 3) default to analyst
    const fallbackRoleHeader = String(req.header('x-role') || '').toLowerCase();
    const envDefaultRole = String(process.env.DEFAULT_ROLE || '').toLowerCase();
    const roleStr = (fallbackRoleHeader || envDefaultRole || 'analyst');
    const role = roleStr === 'admin' ? 'admin' : 'analyst';
    return { role };
}
