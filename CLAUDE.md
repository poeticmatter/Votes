# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:3000
npm run lint       # TypeScript type checking (tsc --noEmit)
npm test           # vitest: rules, map, seeded full games, board render smoke tests
npm run build      # production build
npm run deploy     # build and publish to GitHub Pages
```

## Architecture

Votes: a 2–5 player, take-turns-in-order browser game with no backend of its own. It is part of the game lab (poeticmatter/game-lab) and was created from poeticmatter/game-template, but its platform has been reworked from the template's two-player simultaneous turns to sequential moves for 2–5 players.

- `src/game/`: the game, and `index.ts` exporting `game: GameModule`.
  - `map/`: map content (`mapData.ts`) and everything derived from it (`board.ts`: districts, rail borders, adjacency). Ported from the asset generator.
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn through `placement.ts`, `immigration.ts`, `mergers.ts` and `elections.ts`. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants.
  - `ui/`: the board. `map/` draws the Metro map and pieces; `panels/` are the side panels; `useTurnControls.ts` turns the phase into clickable targets.
- `src/platform/`: game-agnostic lobby, seats, transports and screens. It only sees the game through the contracts in `src/platform/types.ts`.
- `src/game.config.ts`: the game id, title, Supabase table and seat-claim function names.
- `src/App.tsx`: wires the game into the platform and routes on the URL (`?room=CODE[&mode=async]`). Hot-seat matches have no URL.

### Rules contract

- `createInitialState({ settings, playerCount, seed })` and `applyMove(state, move)` must be pure and deterministic. Randomness (the bag) comes from a seeded generator whose state lives in the game state, so every client draws the same cubes.
- `activePlayer(state)` names the seat whose move the game awaits (null once over). A turn may take several moves; transports only apply moves from the active player.
- `applyMove` throws `IllegalMoveError` for a move that breaks the rules; transports catch it (`moveValidation.ts`) and leave the state alone.
- The platform, not the game, counts applied moves as `version`. Transports drop moves made on an older version.

### Seats and transports

- Seat i joins in order and plays `PLAYER_COLORS[i]`. The first player is drawn from the seed. A browser remembers its seat per room in localStorage; anyone with the link can also take back a seat ("That's me") or watch.
- **Async (Supabase)**: `useAsyncMatch` + `asyncMatchApi`. One row per room in `votes_games` on the Supabase project shared by all lab games: `players` (seat list), `player_count`, `state`, `version`. Seats are claimed through the `votes_claim_seat` RPC so concurrent joins can't collide. The active player's client applies each move, shows it at once and queues a write guarded on `version`; a refused write reloads the row. Realtime is best effort, so the hook also catches up on tab focus and on a slow poll, never accepting an older version than it shows.
- **Live (PeerJS)**: `usePeerHost` (the room creator, seat 0, the only peer that runs rules) and `usePeerGuest` (takes a seat, takes one back after a reload, or watches). The game ends if the host closes the tab.
- **Hot seat**: `useHotSeatMatch`. Everyone shares one device; nothing goes online or survives a reload. There is no hidden information, so no handoff screen: `role` is always the active player and the Board gets `seating: 'hot_seat'`.
- All three return `MatchConnection`, so `MatchScreen` in `App.tsx` doesn't care which transport is in use.

## Rules

- Do not import from `src/game/` inside `src/platform/`. Only `App.tsx` joins the two.
- All state changes go through `rules.applyMove`. UI components only render state and submit moves.
- Keep the Supabase names in `game.config.ts` and the migrations in `supabase/migrations/` in sync. New migrations are applied to project `zavdrnttsfcupopdidda` under the name `votes_<number>_…`.

## Votes

- **Rules:** `C:\Code\assets\VotesAssets\Rules\Votes.md` is the current draft and the source of truth. Values in [brackets] are playtest dials and live in `VotesSettings` (the lobby's "Playtest dials").
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference. `src/game/map/` ports its map data and district derivation, `src/game/ui/theme.ts` its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe colours, and `src/game/rules/elections.ts` its seat allocation. Change the map in the asset generator first, then port it.
- **Rule interpretations** the draft doesn't settle, chosen here (revisit with the designer):
  - Each Station is called once per turn, in the order the active player picks; the cube is drawn after the Station is chosen. Every Station that can bring a family must.
  - A tile touching several other cities merges them all in one election, with one merger marker per city joined. The game ends with the election that leaves one city.
  - Players tied with grey for a city's most seats still score; grey blocks only when it leads alone.
  - A colour with no cubes left can't win a seat as the compromise candidate, and seats no cube can fill stay empty.
  - Public tiles never run out. A player with no legal placement passes (immigration still runs); a full round of passes ends the game.
