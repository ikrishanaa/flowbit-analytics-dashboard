"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const prisma_1 = require("./lib/prisma");
const stats_1 = __importDefault(require("./routes/stats"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const trends_1 = __importDefault(require("./routes/trends"));
const vendors_1 = __importDefault(require("./routes/vendors"));
const categories_1 = __importDefault(require("./routes/categories"));
const cashflow_1 = __importDefault(require("./routes/cashflow"));
const chat_1 = __importDefault(require("./routes/chat"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_1 = __importDefault(require("./openapi"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '2mb' }));
app.use((0, morgan_1.default)('dev'));
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use((0, cors_1.default)({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
}));
app.get('/health', async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
app.use('/stats', stats_1.default);
app.use('/invoices', invoices_1.default);
app.use('/invoice-trends', trends_1.default);
app.use('/vendors', vendors_1.default);
app.use('/category-spend', categories_1.default);
app.use('/cash-outflow', cashflow_1.default);
app.use('/chat-with-data', chat_1.default);
// OpenAPI docs
app.get('/openapi.json', (_req, res) => res.json(openapi_1.default));
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_1.default));
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
