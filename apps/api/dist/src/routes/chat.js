"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_stream_1 = require("node:stream");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt)
            return res.status(400).json({ error: 'Missing prompt' });
        const base = process.env.VANNA_API_BASE_URL;
        if (!base)
            return res.status(500).json({ error: 'VANNA_API_BASE_URL not configured' });
        const r = await fetch(`${base.replace(/\/$/, '')}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VANNA_API_KEY || ''}` },
            body: JSON.stringify({ question: prompt }),
        });
        if (!r.ok) {
            const text = await r.text();
            // log failed prompt without sql
            try {
                const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
                await prisma.queryLog.create({ data: { prompt } });
            }
            catch { }
            return res.status(502).json({ error: 'Vanna error', details: text });
        }
        const data = await r.json();
        // persist chat history (prompt + sql)
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            await prisma.queryLog.create({ data: { prompt, sql: data?.sql || null } });
        }
        catch { }
        res.json(data);
    }
    catch (e) {
        console.error(e);
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            const prompt = req.body?.prompt || '';
            if (prompt)
                await prisma.queryLog.create({ data: { prompt } });
        }
        catch { }
        res.status(500).json({ error: 'Chat failed' });
    }
});
// SSE proxy to Vanna's /chat-stream
router.get('/stream', async (req, res) => {
    try {
        const prompt = req.query.prompt || '';
        if (!prompt) {
            res.status(400).end('Missing prompt');
            return;
        }
        const base = process.env.VANNA_API_BASE_URL;
        if (!base) {
            res.writeHead(500, { 'Content-Type': 'text/event-stream' });
            res.write(`event: error\ndata: ${JSON.stringify('VANNA_API_BASE_URL not configured')}\n\n`);
            return res.end();
        }
        // Prepare SSE response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        const keepalive = setInterval(() => {
            try {
                res.write(': keepalive\n\n');
            }
            catch { }
        }, 15000);
        const r = await fetch(`${base.replace(/\/$/, '')}/chat-stream?${new URLSearchParams({ question: prompt })}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${process.env.VANNA_API_KEY || ''}` },
        });
        if (!r.ok || !r.body) {
            res.write(`event: error\ndata: ${JSON.stringify(`Vanna error: ${r.status}`)}\n\n`);
            clearInterval(keepalive);
            return res.end();
        }
        const readable = node_stream_1.Readable.fromWeb(r.body);
        readable.on('data', (chunk) => {
            try {
                res.write(chunk);
            }
            catch { }
        });
        readable.on('end', () => {
            clearInterval(keepalive);
            res.end();
        });
        readable.on('error', (err) => {
            try {
                res.write(`event: error\ndata: ${JSON.stringify(String(err))}\n\n`);
            }
            catch { }
            clearInterval(keepalive);
            res.end();
        });
        req.on('close', () => {
            try {
                readable.destroy();
            }
            catch { }
            clearInterval(keepalive);
        });
    }
    catch (e) {
        res.status(500).end(String(e));
    }
});
exports.default = router;
