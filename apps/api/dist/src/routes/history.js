"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const role = String(req.header('x-role') || '').toLowerCase();
        if (role !== 'admin') {
            return res.status(403).json({ error: 'forbidden' });
        }
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
        const rows = await prisma_1.prisma.queryLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
        res.json(rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load chat history' });
    }
});
exports.default = router;
