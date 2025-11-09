"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dayjs_1 = __importDefault(require("dayjs"));
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const now = (0, dayjs_1.default)();
        const startOfYear = now.startOf('year').toDate();
        const [totalInvoices, documentsUploaded, spendYTD, avgValue] = await Promise.all([
            prisma_1.prisma.invoice.count(),
            prisma_1.prisma.document.count(),
            prisma_1.prisma.invoice.aggregate({
                _sum: { totalAmount: true },
                where: {
                    invoiceDate: { gte: startOfYear },
                    totalAmount: { gt: 0 },
                },
            }),
            prisma_1.prisma.invoice.aggregate({
                _avg: { totalAmount: true },
                where: { totalAmount: { gt: 0 } },
            }),
        ]);
        res.json({
            totalSpendYTD: Number(spendYTD._sum.totalAmount ?? 0),
            totalInvoicesProcessed: totalInvoices,
            documentsUploaded,
            averageInvoiceValue: Number(avgValue._avg.totalAmount ?? 0),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to compute stats' });
    }
});
exports.default = router;
