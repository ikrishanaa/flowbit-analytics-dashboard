"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT COALESCE(li.category, 'Uncategorized') AS category,
             COALESCE(SUM(ABS(li."totalPrice")), 0)::float AS amount
      FROM "LineItem" li
      GROUP BY category
      ORDER BY amount DESC;
    `;
        res.json(rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load category spend' });
    }
});
exports.default = router;
