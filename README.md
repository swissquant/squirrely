# squirrely 🐿️

A local portfolio construction helper. Pick a basket of markets, choose a sizing rule (inverse-vol or ERC) and a risk target, and see how the resulting weights would have performed historically — all backtested on your machine against Yahoo Finance data. The Live allocation tab translates those target weights into the exact USD amounts and native units (shares, BTC, etc.) to buy today to match the ideal portfolio. Built with AdonisJS + SQLite, no external services required.

## Requirements

- Node.js 22 or newer

## Quick start

```bash
npm install
node ace up
```

Then open http://localhost:3333.

`node ace up` is idempotent: it creates `.env` from `.env.example` (if missing), generates an `APP_KEY` (if empty), runs database migrations, syncs market data from Yahoo Finance, and starts the dev server. Safe to re-run any time — use it on every launch to keep data fresh, or `npm run dev` to skip the sync.

## Scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `node ace up`       | Full launch: env, migrations, data sync, dev server   |
| `npm run dev`       | Start the dev server with HMR (no setup/sync)         |
| `npm run build`     | Build production bundle                               |
| `npm start`         | Run the production build                              |
| `npm test`          | Run the test suite                                    |
| `npm run lint`      | Lint the codebase                                     |
| `npm run typecheck` | Type-check server and frontend                        |
