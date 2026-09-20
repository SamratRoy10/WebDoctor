# WebDoctor

Premium AI security command-center prototype powered by a Node/Express proxy for the Kopai Agent Execution API.

## Run locally

```bash
npm install
cp .env.example .env
# Set KOPAI_API_KEY and KOPAI_AGENT_ID in .env
npm start
```

Open http://localhost:3000.

## Kopai integration

The browser never receives the Kopai API key. `server.js` calls `POST https://usekopai.com/api/v1/chat/completions` with:

- `model`: `KOPAI_AGENT_ID`
- `user`: stable `WEBDOCTOR_END_USER_ID`
- `stream: true`
- an `Idempotency-Key` for safe retries

The frontend calls `POST /api/scan`. The server aggregates Kopai's SSE response and returns the assistant text plus Kopai metadata. The API key must be an organization key with the `agent:export` permission.

`KOPAI_AGENT_ID` is intentionally a placeholder until the exposed WebDoctor agent slug is provided.
