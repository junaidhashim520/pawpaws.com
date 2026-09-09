import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
test('waitlist validates, normalizes, and deduplicates saved entries', async () => {
 const { app, db } = createApp(':memory:');
 const server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 const url = `http://127.0.0.1:${server.address().port}/api/waitlist`;
 const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 try {
  assert.equal((await post({email:'bad'})).status, 400);
  assert.equal((await post({email:' PET@example.com ',name:' Jamie '})).status, 201);
  assert.equal((await post({email:'pet@example.com',name:'Jamie'})).status, 201);
  const rows = db.prepare('SELECT * FROM waitlist').all();
  assert.equal(rows.length, 1); assert.equal(rows[0].email, 'pet@example.com'); assert.equal(rows[0].name, 'Jamie');
 } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
test('orders and support requests are persisted for the team', async () => {
 const { app, db } = createApp(':memory:'); const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
 const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 try {
  const order = await post('/api/orders', { name: 'Jamie', email: 'jamie@example.com', delivery: 'ship', items: [{ id: 'food-1', name: 'Daily food', price: 12, quantity: 2 }] }); assert.equal(order.status, 201);
  const support = await post('/api/support', { name: 'Jamie', email: 'jamie@example.com', message: 'I need a pet visit while I am away.' }); assert.equal(support.status, 201);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM orders').get().count, 1); assert.equal(db.prepare('SELECT COUNT(*) AS count FROM support_requests').get().count, 1);
  assert.equal((await post('/api/support', { name: 'Jamie', email: 'bad', message: 'Help' })).status, 400);
 } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
