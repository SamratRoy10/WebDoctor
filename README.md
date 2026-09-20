# WebDoctor

WebDoctor is an AI full-stack security agent with a user-scoped chat experience.

## Product flow

1. Enter a demo workspace with a fake user identity.
2. Connect GitHub through Kopai's `/api/integrations` flow.
3. Ask WebDoctor to list or import repositories.
4. Ask it to scan a selected repository and investigate attack paths.

Each fake user receives a stable in-memory session and a stable Kopai `endUserId` (`webdoctor:<user-id>`). This keeps each user's connected GitHub account and agent memory separate during the demo.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Set `KOPAI_API_KEY` in `.env`. The agent ID is preconfigured as `cmu889j3z00000agmyyjq1bxc` but can be overridden with `KOPAI_AGENT_ID`.

The GitHub OAuth redirect domain must be registered in Kopai under Settings → Integrations → API redirect domains. For local development, register `http://localhost:3000`.

This demo uses in-memory sessions, so user accounts reset when the server restarts. Replace the session store with a real auth/database layer before production.
