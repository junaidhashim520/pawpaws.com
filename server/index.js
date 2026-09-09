import { installCatalog } from './catalog.js';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function createApp(databasePath = 'data/pawpass.sqlite', options = {}) {
  if (databasePath !== ':memory:') mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('CREATE TABLE IF NOT EXISTS waitlist (email TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)');
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
  installCatalog(app, db, options.uploadDir || path.resolve(path.dirname(databasePath === ':memory:' ? 'data/pawpass.sqlite' : databasePath), 'uploads'));
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
