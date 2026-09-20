# WebDoctor

WebDoctor is a repository-first AI security investigation workspace. It uses Kopai to connect a user's GitHub account, list their repositories, and run a preloaded investigation when a repository is selected.

## Product flow

1. Enter a fake demo workspace. Each workspace receives a stable session and Kopai `endUserId`.
2. Connect GitHub through `POST /api/integrations`.
3. Load all accessible repositories through a preloaded Kopai agent message at `POST /api/repositories`.
4. Select a repository. The UI automatically starts `POST /api/investigations` with a preloaded investigation instruction.
5. Display the returned Kopai agent output as the assessment — no chat composer or conversational UI.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Set `KOPAI_API_KEY` in `.env`. The exposed agent ID defaults to `cmu889j3z00000agmyyjq1bxc` and can be overridden with `KOPAI_AGENT_ID`.

Register the local redirect origin in Kopai: `http://localhost:3000`.

The demo user/session store is intentionally in memory for the prototype. Replace it with real authentication and a persistent store before production.

## API notes

The server uses Kopai's native `POST /api/v1/agents/{id}/messages` endpoint and sends the same sanitized `endUserId` for integrations, repository loading, and investigations. The API key is server-side only.
