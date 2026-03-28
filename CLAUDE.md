# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## GitHub Issues

**Never close a GitHub issue unless the user explicitly says to close it and names which issue(s).**

- Do not close issues as "housekeeping" or because the code appears complete.
- Do not close issues in bulk without permission.
- When we finish work on an issue together, ask the user if they want it closed — do not close it automatically.

## General Rules

- Follow TDD: write failing tests before writing implementation code.
- Only make changes directly requested or clearly necessary for the task at hand.

## Commands

```bash
# Development (runs Express server + Vite client concurrently)
npm run dev

# Run all tests
npm test

# Run a single test file
npx jest src/game/__tests__/damage.test.ts

# Run tests in watch mode
npm run test:watch

# Build (TypeScript + Vite client + Prisma generate)
npm run build

# Database
npm run db:push       # push schema changes (dev, no migration file)
npm run db:migrate    # create and apply migration
npm run db:seed       # seed database
npm run db:studio     # open Prisma Studio
```

Tests live in `src/game/__tests__/` and `server/src/__tests__/`. Jest is configured via `jest.config.js` to pick up `**/__tests__/**/*.ts` and `**/*.test.ts` from both `src/` and `server/src/`.

The client has its own `package.json` under `client/`. Run `npm run dev --prefix client` to start it independently.

## Architecture

This is a **Discord Activity** dungeon-crawler RPG. Players build domino chains to deal damage to enemies across multi-act runs.

### Monorepo Layout

```
src/          — shared game logic (pure TypeScript, no framework deps)
server/src/   — Express + WebSocket backend
client/src/   — React + Vite frontend (Discord Embedded App SDK)
prisma/       — PostgreSQL schema (persistent leaderboard/run data)
```

### Shared Game Engine (`src/`)

All combat math lives here — importable by both the server and tests.

| Module | Role |
|---|---|
| `game/board.ts` | `Board` class — tracks `BoardTile[]`, open ends (left/right pip), play validity |
| `game/chain.ts` | `Chain` class — player's active combo chain (right-end-only play) |
| `game/damage.ts` | `calculateDamage` — junction formula: each N-pip junction deals `N×2`; `applyArmor` |
| `game/bag.ts` | Stone bag draw/shuffle |
| `game/hand.ts` | Hand management |
| `game/hp.ts` | HP/damage helpers |
| `game/swap.ts` | Swap-stone logic |
| `game/elements/element-engine.ts` | `analyzeChain` / `applyChainEffects` — elemental combos (fire/ice/lightning/poison/earth) |
| `game/ai/enemy-board-ai.ts` | Enemy stone-play decision logic |
| `game/ai/enemy-templates.ts` | Seeded enemy generation (`scaleEnemy`) |
| `game/relics/` | `common`, `rare`, `epic`, `legendary` relic effect functions |
| `game/models/` | Plain types: `Stone`, `Enemy`, `PlayerState`, `PlayerStats` |
| `dungeon/run.ts` | `Run` state machine (`startRun`, `completeRun`, `failRun`) |
| `dungeon/node-types.ts` | `DungeonNode` / `NodeType` definitions |
| `session/combat-session.ts` | Redis-backed `CombatSession` serialization |
| `types/api.ts` | All HTTP request/response interfaces shared between server and client |
| `lib/redis.ts` | ioredis client |

### Server (`server/src/`)

Express app with REST routes + a WebSocket server.

- `routes/auth.ts` — Discord OAuth token exchange, user upsert
- `routes/runs.ts` — start/load runs, advance map nodes
- `routes/combat.ts` — `POST /api/run/:id/combat/start|play-stone|end-turn` — the hot path; reads/writes `CombatSession` from Redis and `RunState` from Redis
- `routes/nodes.ts` — shop, rest, event, relic-selection node resolution
- `routes/leaderboard.ts` — top-scores query
- `ws/game-ws.ts` — WebSocket server (real-time combat updates)
- `middleware/` — auth middleware

Run state is stored in **Redis** (TTL 24 h, key `run:<runId>`). Persistent data (users, leaderboard entries) goes to **PostgreSQL via Prisma**.

### Client (`client/src/`)

React SPA. Screen routing is a simple `switch` in `App.tsx` driven by `GameContext`.

| Layer | Details |
|---|---|
| `context/GameContext.tsx` | Central state: `screen`, `runId`, current player/combat state |
| `screens/` | One component per screen (Menu, DungeonMap, Combat, Shop, Rest, Event, RelicSelection, RunSummary, Leaderboard) |
| `components/` | Shared UI (RelicBar, domino tiles, HP bars, etc.) |
| `hooks/useViewportScale.ts` | Computes CSS `zoom` scale for the 1920×1080 game canvas |

The canvas is scaled with **CSS `zoom`** (not `transform: scale`) to avoid pointer-event clipping.

### Damage Formula

`calculateDamage(chain, playerStats, elementBonus)`:
- For each stone after the first, the connecting pip value `N` contributes `N × 2` (both touching faces share the same pip value).
- Single stone = 0 damage (no junctions).
- `elementBonus` is added flat on top.

Enemy damage follows the same junction formula applied to the enemy's played chain (`toChainForTurn` → `calculateDamage`).
