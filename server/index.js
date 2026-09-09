import { installCatalog } from './catalog.js';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

function loadLocalEnv() {
  try {
    const contents = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* Local .env is optional in hosted environments. */ }
}
loadLocalEnv();

export function createApp(databasePath = 'data/pawpass.sqlite', options = {}) {
  if (databasePath !== ':memory:') mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('CREATE TABLE IF NOT EXISTS waitlist (email TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, delivery TEXT NOT NULL, items TEXT NOT NULL, subtotal REAL NOT NULL, shipping REAL NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT \'new\', created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS support_requests (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'new\')');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8mb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/waitlist', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length > 100) {
      return res.status(400).json({ error: 'Please enter a valid email and a name under 100 characters.' });
    }
    try {
      db.prepare('INSERT OR IGNORE INTO waitlist (email, name, created_at) VALUES (?, ?, ?)').run(email, name, new Date().toISOString());
      res.status(201).json({ message: 'You are on the list.' });
    } catch {
      res.status(503).json({ error: 'We could not save your spot. Please try again shortly.' });
    }
  });
  const requireAdmin = installCatalog(app, db, options.uploadDir || path.resolve(path.dirname(databasePath === ':memory:' ? 'data/pawpass.sqlite' : databasePath), 'uploads'));
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  app.post('/api/orders', (req, res) => {
    const { name, email, delivery, items } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || typeof email !== 'string' || !emailPattern.test(email.trim()) || email.trim().length > 254 || !['ship', 'pickup'].includes(delivery) || !Array.isArray(items) || !items.length || items.length > 50) return res.status(400).json({ error: 'Please provide your name, a valid email, delivery choice, and at least one item.' });
    const cleanItems = items.map(item => ({ id: typeof item.id === 'string' ? item.id : '', quantity: Number.isInteger(item.quantity) ? item.quantity : 0, price: typeof item.price === 'number' ? item.price : 0, name: typeof item.name === 'string' ? item.name.slice(0, 100) : '' }));
    if (cleanItems.some(item => !item.id || !item.name || item.quantity < 1 || item.quantity > 10 || item.price < 0)) return res.status(400).json({ error: 'One or more items in this order are invalid.' });
    const subtotal = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0); const shipping = delivery === 'pickup' || subtotal >= 60 ? 0 : 5; const total = subtotal + shipping; const id = `PP-${randomUUID().slice(0, 8).toUpperCase()}`; const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, name.trim(), email.trim().toLowerCase(), delivery, JSON.stringify(cleanItems), subtotal, shipping, total, 'new', createdAt);
    res.status(201).json({ id, total, count: cleanItems.reduce((sum, item) => sum + item.quantity, 0) });
  });
  app.post('/api/support', (req, res) => {
    const { name, email, message } = req.body || {};
    if (typeof name !== 'string' || name.trim().length > 100 || typeof email !== 'string' || !emailPattern.test(email.trim()) || email.trim().length > 254 || typeof message !== 'string' || message.trim().length < 2 || message.trim().length > 2000) return res.status(400).json({ error: 'Please provide your name, a valid email, and a question under 2,000 characters.' });
    const id = `SUP-${randomUUID().slice(0, 8).toUpperCase()}`; db.prepare('INSERT INTO support_requests VALUES (?,?,?,?,?,?)').run(id, name.trim(), email.trim().toLowerCase(), message.trim(), new Date().toISOString(), 'new'); res.status(201).json({ id, message: 'Your request is with the PawPass team.' });
  });
  app.post('/api/ai/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'your-gemini-api-key') return res.status(503).json({ error: 'PawPass AI needs a real GEMINI_API_KEY in the server .env file. Replace the template placeholder, then restart the server.' });
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.filter(message => message && ['user', 'model'].includes(message.role) && typeof message.text === 'string').slice(-12) : [];
    if (!messages.length || messages.some(message => message.text.length > 4000)) return res.status(400).json({ error: 'Please send a valid conversation.' });
    const system = `You are PawPass Care Guide, a warm and concise customer-care AI for PawPass, a pet shop and care service. PawPass provides pet essentials, pet sitting, home visits, dog walking, grooming support, and care while customers are working, traveling, or away. Explain that this website demo does not take payment or automatically dispatch products. The customer can place an order through checkout, and orders appear in the admin inbox. You may help collect a care or support request, but never claim an appointment, payment, booking, refund, or human reply is completed. Ask for the customer's name and email before creating a request. When you have a clear care/support request and both name and email, return a handoff object. Always return valid JSON only in this shape: {"reply":"short helpful answer","handoff":null} or {"reply":"confirmation","handoff":{"name":"...","email":"...","message":"..."}}. Keep replies under 120 words. Do not provide veterinary diagnosis; recommend a veterinarian for urgent medical concerns.`;
    const contents = messages.map(message => ({ role: message.role, parts: [{ text: message.text }] }));
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 300 } }) });
      const data = await response.json(); if (!response.ok) return res.status(502).json({ error: 'PawPass AI is temporarily unavailable.' });
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text; const answer = JSON.parse(raw || '{}'); if (typeof answer.reply !== 'string') throw new Error('Invalid AI response.');
      let requestId = null;
      if (answer.handoff && typeof answer.handoff.name === 'string' && typeof answer.handoff.email === 'string' && typeof answer.handoff.message === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer.handoff.email)) { requestId = `SUP-${randomUUID().slice(0, 8).toUpperCase()}`; db.prepare('INSERT INTO support_requests VALUES (?,?,?,?,?,?)').run(requestId, answer.handoff.name.slice(0, 100), answer.handoff.email.slice(0, 254).toLowerCase(), answer.handoff.message.slice(0, 2000), new Date().toISOString(), 'new'); }
      res.json({ reply: answer.reply, requestId });
    } catch { res.status(502).json({ error: 'PawPass AI could not complete that message. Please try again.' }); }
  });
  app.get('/api/admin/orders', requireAdmin, (_req, res) => res.json(db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(order => ({ ...order, items: JSON.parse(order.items) }))));
  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => { const status = req.body?.status; if (!['new', 'confirmed', 'complete', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid order status.' }); const result = db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id); if (!result.changes) return res.status(404).json({ error: 'Order not found.' }); res.json({ ok: true }); });
  app.get('/api/admin/support', requireAdmin, (_req, res) => res.json(db.prepare('SELECT * FROM support_requests ORDER BY created_at DESC').all()));
  app.patch('/api/admin/support/:id', requireAdmin, (req, res) => { const status = req.body?.status; if (!['new', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid support status.' }); const result = db.prepare('UPDATE support_requests SET status=? WHERE id=?').run(status, req.params.id); if (!result.changes) return res.status(404).json({ error: 'Support request not found.' }); res.json({ ok: true }); });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.status === 413 ? 'Request is too large.' : 'Unable to process this request.' }));
  return { app, db };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app } = createApp(process.env.DATA_FILE || 'data/pawpass.sqlite');
  const port = Number(process.env.API_PORT || 3001);
  app.listen(port, '127.0.0.1', () => console.log(`PawPass server: http://127.0.0.1:${port}`));
}
