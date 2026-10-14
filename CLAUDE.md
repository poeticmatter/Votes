# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:3000
npm run lint       # TypeScript type checking (tsc --noEmit)
npm run build      # production build
npm run deploy     # build and publish to GitHub Pages
npm run init-game -- <repo-name> <game-id> "<Title>"   # one-time rename of a fresh template copy
```

## Architecture

A two-player, simultaneous-turn browser game with no backend of its own. It is part of the game lab (poeticmatter/game-lab); each game lives in its own repo created from poeticmatter/game-template.

- `src/game/`: the game. Pure rules (`rules.ts`), React UI (`Board.tsx`, `SettingsForm.tsx`), and `index.ts` exporting `game: GameModule`.
- `src/platform/`: game-agnostic lobby, transports and screens. It only sees the game through the `GameModule` / `GameRules` contracts in `src/platform/types.ts`.
- `src/game.config.ts`: the game id, title and Supabase table name.
- `src/App.tsx`: wires the game into the platform and routes on the URL (`?room=CODE[&mode=async]`). Hot-seat matches have no URL.

### Rules contract

- `createInitialState(settings)` and `resolveTurn(state, p1Plan, p2Plan)` must be pure and deterministic. In async play, whichever client submits second resolves the turn.
- State and plans carry `turn`. Transports drop plans whose `turn` doesn't match the current state.

### Transports

- **Live (PeerJS)**: `usePeerHost` (the room creator, always player 1, the only peer that runs rules) and `usePeerGuest` (player 2 or a spectator). Commit-and-hold: the host's plan is held until the guest's plan arrives, so the host gets no information advantage.
- **Async (Supabase)**: `useAsyncMatch` + `asyncMatchApi`. One row per room in this game's own table (`<game-id>_games`) on the Supabase project shared by all lab games. Writes are guarded on the `turn` column.
- **Hot seat**: `useHotSeatMatch`. Both players share one device; nothing goes online and nothing survives a reload. Player 1 commits, `HandoffScreen` hides the board while the device changes hands, player 2 commits, then the turn resolves. `role` is the player currently at the device, and the Board gets `seating: 'hot_seat'`.
- All three return `MatchConnection`, so `MatchScreen` / `GameBoard` in `App.tsx` don't care which transport is in use.

## Rules

- Do not import from `src/game/` inside `src/platform/`. Only `App.tsx` joins the two.
- All state changes go through `rules.resolveTurn`. UI components only render state and submit plans.
- Keep the Supabase table name in `game.config.ts` and the migration in `supabase/migrations/` in sync.
