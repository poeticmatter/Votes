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

Votes: a 2–5 player, take-turns-in-order browser game with no backend of its own. It is part of the game lab (poeticmatter/game-lab). Its multiplayer platform (lobby, seats, async, live and hot-seat play) comes from **GameKit** (`game-kit/turns`), a package pinned in `package.json` to a release tag of poeticmatter/GameKit (local copy: `C:\Code\GameKit`).

- `src/game/`: the game, and `index.ts` exporting `game: GameModule`.
  - `map/`: map content (`mapData.ts`) and everything derived from it (`board.ts`: districts, rail borders, adjacency). Ported from the asset generator.
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn through `placement.ts`, `immigration.ts`, `mergers.ts` and `elections.ts`. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants.
  - `ui/`: the board. `map/` draws the Metro map and pieces; `panels/` are the side panels; `useTurnControls.ts` turns the phase into clickable targets; `viewer.tsx` holds who is looking and the colour each player is drawn in.
- `src/game.config.ts`: the game's `GameConfig` (id, title, tagline, Supabase settings from `.env.local`).
- `src/App.tsx`: renders `<TurnBasedGameApp config={GAME_CONFIG} game={game} />`; GameKit routes on the URL (`?room=CODE[&mode=async]`).
- `src/index.css`: imports GameKit's theme and sets the Barlow font. GameKit's default palette is the Metro look.

### Rules contract (GameKit's turn-based contract)

- `createInitialState({ settings, playerCount, seed })` and `applyMove(state, move)` must be pure and deterministic. Randomness (the bag) uses GameKit's seeded `nextIndex`, with the generator state kept in the game state, so every client draws the same cubes.
- `activePlayer(state)` names the seat whose move the game awaits (null once over). A turn may take several moves; GameKit only applies moves from the active player.
- `applyMove` throws GameKit's `IllegalMoveError` for a move that breaks the rules; GameKit catches it and leaves the state alone.

### Seats and transports (in GameKit)

- Seat i joins in order and plays `PLAYER_COLORS[i]`. The first player is drawn from the seed.
- **Async (Supabase)**: one row per room in `votes_games` (`players`, `player_count`, `state`, `version`); seats are claimed through the `votes_claim_seat` RPC. Both are defined by this repo's `supabase/migrations/`.
- **Live (PeerJS)** needs nothing from this repo beyond `GAME_CONFIG.id`.
- **Hot seat** is GameKit's solo playtest: several tables, a random seat each turn, the played seat disguised as seat 0. The board draws, names and orders every player colour through `BoardProps.lookOf` (via `ui/viewer.tsx`: `usePieceColorOf`, `useByLook`), never `PIECE_COLORS[color]` directly; lists of players start from the viewer's seat. `rules.outcome` gives the summary its winners and scores.
- To change platform behaviour, change GameKit, tag a release, and bump the `game-kit` version in `package.json`. Don't patch `node_modules/game-kit`.

## Rules

- All state changes go through `rules.applyMove`. UI components only render state and submit moves.
- Keep `GAME_CONFIG.id` and the table and function names in `supabase/migrations/` in sync. New migrations are applied to project `zavdrnttsfcupopdidda` under the name `votes_<number>_…`.

## Votes

- **Rules:** `C:\Code\assets\VotesAssets\Rules\Votes.md` is the current draft and the source of truth. Values in [brackets] are playtest dials and live in `VotesSettings` (the lobby's "Playtest dials").
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference. `src/game/map/` ports its map data and district derivation, `src/game/ui/theme.ts` its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe colours, and `src/game/rules/elections.ts` its seat allocation. Change the map in the asset generator first, then port it.
- **Rule interpretations** the draft doesn't settle, chosen here (revisit with the designer):
  - Immigration fills every home and job it can in the turn the room appears: the active player calls any Station that can bring a family, as often as needed, and the cube is drawn after the Station is chosen. It stops when no Station can bring anyone (no open job, no empty home in a stationed district, or an empty bag).
  - The first family into a district in a turn pays each Station owner there 1 cube (once per owner, however many Stations). Every family still pays its Residence's owner 1 cube, so one player can add 2 for the same family.
  - A tile touching several other cities merges them all in one election, with one merger marker per city joined. The game ends with the election that leaves one city.
  - Only families in a Residence next to a School vote, and a School across a district line counts. Every Residence still adds a seat to its district.
  - Players tied with grey for a city's most seats still score; grey blocks only when it leads alone.
  - A colour with no cubes left can't win a seat as the compromise candidate, and seats no cube can fill stay empty.
  - Public tiles never run out. A player with no legal placement passes (immigration still runs); a full round of passes ends the game.
