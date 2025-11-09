"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
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
            return res.status(502).json({ error: 'Vanna error', details: text });
        }
        const data = await r.json();
        res.json(data);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Chat failed' });
    }
});
exports.default = router;
