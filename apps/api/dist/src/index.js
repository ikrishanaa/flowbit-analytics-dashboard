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
const history_1 = __importDefault(require("./routes/history"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '2mb' }));
app.use((0, morgan_1.default)('dev'));
const corsOrigin = process.env.CORS_ORIGIN || '*';
// Configure CORS: if '*' then reflect request origins and disable credentials; otherwise allow listed origins
const corsOptions = corsOrigin === '*'
    ? { origin: true, credentials: false }
    : { origin: corsOrigin.split(',').map((s) => s.trim()), credentials: false };
app.use((0, cors_1.default)(corsOptions));
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
app.use('/chat-history', history_1.default);
// OpenAPI docs
app.get('/openapi.json', (_req, res) => res.json(openapi_1.default));
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_1.default));
// Friendly landing page
app.get('/', (_req, res) => {
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Flowbit API</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:24px;line-height:1.6}</style></head><body><h1>Flowbit Analytics API</h1><p>Useful links:</p><ul><li><a href="/health">/health</a></li><li><a href="/docs">/docs</a></li><li><a href="/stats">/stats</a></li><li><a href="/invoice-trends">/invoice-trends</a></li></ul></body></html>`);
});
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
