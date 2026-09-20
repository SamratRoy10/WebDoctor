import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const kopaiUrl = 'https://usekopai.com/api/v1/chat/completions';

app.use(express.json({ limit: '1mb' }));

function configError() {
  if (!process.env.KOPAI_API_KEY) return 'KOPAI_API_KEY is not configured';
  if (!process.env.KOPAI_AGENT_ID || process.env.KOPAI_AGENT_ID === 'webdoctor-agent-id') return 'KOPAI_AGENT_ID is not configured';
  return null;
}

async function readSse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let kopai = [];

  const consume = (frame) => {
    const data = frame.split('\\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('');
    if (!data || data === '[DONE]') return;
    try {
      const chunk = JSON.parse(data);
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) text += delta.content;
      if (delta?.kopai) kopai.push(delta.kopai);
      if (chunk.error) throw new Error(chunk.error.message || 'Kopai stream failed');
    } catch (error) {
      if (error instanceof SyntaxError) return;
      throw error;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split('\\n\\n');
    buffer = frames.pop() || '';
    for (const frame of frames) consume(frame);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);
  return { text, kopai };
}

app.post('/api/scan', async (req, res) => {
  const missing = configError();
  if (missing) return res.status(503).json({ error: `${missing}. Copy .env.example to .env and fill it in.` });

  const endUserId = process.env.WEBDOCTOR_END_USER_ID || 'webdoctor-demo-user';
  const idempotencyKey = crypto.randomUUID();
  const prompt = `Run an authorized full-stack security assessment for this scope: ${req.body?.scope || 'authorized application'}. Analyze application/API and system/infrastructure risk, correlate attack paths, and return concise evidence, confidence, vulnerabilities, components, remediation actions, and a security score. Do not claim exploitation beyond available evidence.`;

  try {
    const upstream = await fetch(kopaiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KOPAI_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        model: process.env.KOPAI_AGENT_ID,
        user: endUserId,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        stream_options: { include_usage: true }
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(upstream.status).json({ error: `Kopai returned ${upstream.status}`, detail: detail.slice(0, 500) });
    }

    const result = await readSse(upstream);
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Unable to reach Kopai' });
  }
});

app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'), (error) => {
    if (error) res.status(500).end();
  });
});

app.listen(port, () => console.log(`WebDoctor running at http://localhost:${port}`));
