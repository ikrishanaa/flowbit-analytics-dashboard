"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const role = String(req.header('x-role') || '').toLowerCase();
        const q = req.query.q || '';
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);
        const sort = req.query.sort || 'invoiceDate:desc';
        const [sortField, sortDir] = sort.split(':');
        const where = q
            ? {
                OR: [
                    { invoiceNumber: { contains: q, mode: 'insensitive' } },
                    { vendor: { name: { contains: q, mode: 'insensitive' } } },
                    { customer: { name: { contains: q, mode: 'insensitive' } } },
                ],
            }
            : {};
        const total = await prisma_1.prisma.invoice.count({ where });
        const items = await prisma_1.prisma.invoice.findMany({
            where,
            include: { vendor: true },
            orderBy: [{ [sortField || 'invoiceDate']: (sortDir === 'asc' ? 'asc' : 'desc') }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        const mapped = items.map((i) => ({
            id: i.id,
            vendor: i.vendor?.name || null,
            invoiceDate: i.invoiceDate,
            invoiceNumber: i.invoiceNumber,
            amount: role === 'admin' ? i.totalAmount : null,
            status: role === 'admin' ? i.status : null,
        }));
        res.json({ page, pageSize, total, items: mapped });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load invoices' });
    }
});
exports.default = router;
