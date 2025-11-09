"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dayjs_1 = __importDefault(require("dayjs"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { role } = (0, auth_1.getAuth)(req);
        const startParam = req.query.start;
        const endParam = req.query.end;
        const bucket = String(req.query.bucket || '1') === '1';
        const start = startParam ? (0, dayjs_1.default)(startParam) : (0, dayjs_1.default)();
        const end = endParam ? (0, dayjs_1.default)(endParam) : (0, dayjs_1.default)().add(90, 'day');
        if (bucket) {
            const thresholds = {
                d7: start.add(7, 'day').toDate(),
                d30: start.add(30, 'day').toDate(),
                d60: start.add(60, 'day').toDate(),
            };
            const row = await prisma_1.prisma.$queryRaw `
        WITH due AS (
          SELECT i."dueDate"::date AS d,
                 CASE WHEN i."totalAmount" > 0 THEN i."totalAmount" ELSE 0 END AS amt
          FROM "Invoice" i
          WHERE i."dueDate" IS NOT NULL
            AND i."dueDate"::date BETWEEN ${start.toDate()}::date AND ${end.toDate()}::date
        )
        SELECT
          COALESCE(SUM(CASE WHEN d <= ${thresholds.d7}::date THEN amt ELSE 0 END), 0)::float AS d0_7,
          COALESCE(SUM(CASE WHEN d > ${thresholds.d7}::date AND d <= ${thresholds.d30}::date THEN amt ELSE 0 END), 0)::float AS d8_30,
          COALESCE(SUM(CASE WHEN d > ${thresholds.d30}::date AND d <= ${thresholds.d60}::date THEN amt ELSE 0 END), 0)::float AS d31_60,
          COALESCE(SUM(CASE WHEN d > ${thresholds.d60}::date THEN amt ELSE 0 END), 0)::float AS d60_plus
        FROM due;
      `;
            const one = row[0] || { d0_7: 0, d8_30: 0, d31_60: 0, d60_plus: 0 };
            const payload = [
                { label: '0 - 7 days', amount: Number(one.d0_7 || 0) },
                { label: '8 - 30 days', amount: Number(one.d8_30 || 0) },
                { label: '31 - 60 days', amount: Number(one.d31_60 || 0) },
                { label: '60+ days', amount: Number(one.d60_plus || 0) },
            ];
            res.json(role === 'admin' ? payload : payload.map(p => ({ ...p, amount: 0 })));
            return;
        }
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
