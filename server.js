import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
const agentId = process.env.KOPAI_AGENT_ID || 'cmu889j3z00000agmyyjq1bxc';
const sessions = new Map();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function session(req, res, next) {
  const id = req.headers['x-webdoctor-session'];
  const current = id && sessions.get(id);
  if (!current) return res.status(401).json({ error: 'login_required' });
  req.user = current;
  next();
}
function endUserId(user) { return `webdoctor-${user.id}`; }
function kopaiHeaders(extra = {}) {
  return { Authorization: `Bearer ${process.env.KOPAI_API_KEY || ''}`, 'Content-Type': 'application/json', ...extra };
}

app.post('/api/auth/demo-login', (req, res) => {
  const name = String(req.body?.name || 'Security Explorer').trim().slice(0, 40);
  const id = crypto.randomUUID();
  const user = { id, name, avatar: name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(), createdAt: new Date().toISOString() };
  sessions.set(id, user);
  res.json({ sessionId: id, user });
});
app.get('/api/auth/me', session, (req, res) => res.json({ user: req.user, endUserId: endUserId(req.user) }));
app.post('/api/auth/logout', session, (req, res) => { sessions.delete(req.headers['x-webdoctor-session']); res.json({ ok: true }); });

app.post('/api/integrations', session, async (req, res) => {
  const toolkit = req.body?.toolkit || 'github';
  const redirectUri = req.body?.redirectUri || `${req.protocol}://${req.get('host')}/?connected=github`;
  try {
    const r = await fetch(`https://usekopai.com/api/v1/agents/${agentId}/integrations`, { method: 'POST', headers: kopaiHeaders(), body: JSON.stringify({ toolkit, endUserId: endUserId(req.user), redirectUri }) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) { res.status(502).json({ error: 'kopai_unreachable', message: e.message }); }
});
app.get('/api/integrations', session, async (req, res) => {
  try {
    const r = await fetch(`https://usekopai.com/api/v1/agents/${agentId}/integrations?endUserId=${encodeURIComponent(endUserId(req.user))}`, { headers: kopaiHeaders() });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(502).json({ error: 'kopai_unreachable', message: e.message }); }
});

app.post('/api/chat', session, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message_required' });
  try {
    const r = await fetch('https://usekopai.com/api/v1/chat/completions', { method: 'POST', headers: kopaiHeaders({ Accept: 'application/json' }), body: JSON.stringify({ model: agentId, user: endUserId(req.user), stream: false, messages: [{ role: 'user', content: message }] }) });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    const text = data?.choices?.[0]?.message?.content || data?.content || JSON.stringify(data);
    res.json({ text, raw: data });
  } catch (e) { res.status(502).json({ error: 'kopai_unreachable', message: e.message }); }
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(port, () => console.log(`WebDoctor listening on http://localhost:${port}`));
