"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { role } = (0, auth_1.getAuth)(req);
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT to_char(date_trunc('month', "invoiceDate"), 'YYYY-MM') AS month,
             COUNT(*)::int AS invoice_count,
             COALESCE(SUM(CASE WHEN "totalAmount" > 0 THEN "totalAmount" ELSE 0 END), 0)::float AS total_spend
      FROM "Invoice"
      WHERE "invoiceDate" IS NOT NULL
      GROUP BY 1
      ORDER BY 1 ASC;
    `;
        const masked = role === 'admin' ? rows : rows.map(r => ({ ...r, total_spend: 0 }));
        res.json(masked);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load trends' });
    }
});
exports.default = router;
