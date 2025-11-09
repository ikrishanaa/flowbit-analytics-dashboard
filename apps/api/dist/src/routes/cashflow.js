"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dayjs_1 = __importDefault(require("dayjs"));
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const role = String(req.header('x-role') || '').toLowerCase();
        const startParam = req.query.start;
        const endParam = req.query.end;
        const start = startParam ? (0, dayjs_1.default)(startParam) : (0, dayjs_1.default)();
        const end = endParam ? (0, dayjs_1.default)(endParam) : (0, dayjs_1.default)().add(90, 'day');
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(CASE WHEN i."totalAmount" > 0 THEN i."totalAmount" ELSE 0 END), 0)::float AS outflow
      FROM generate_series(${start.toDate()}::timestamp, ${end.toDate()}::timestamp, interval '1 day') AS d
      LEFT JOIN "Invoice" i ON i."dueDate"::date = d::date
      GROUP BY 1
      ORDER BY 1 ASC;
    `;
        res.json(role === 'admin' ? rows : rows.map(r => ({ ...r, outflow: 0 })));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load cash outflow forecast' });
    }
});
exports.default = router;
