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
  - `map/`: map content (`mapData.ts`) and everything derived from it (`board.ts`: districts, rail borders, station sites, adjacency). Ported from the asset generator.
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn through `placement.ts`, `relocation.ts` (Schools), `immigration.ts`, `housing.ts`, `mergers.ts` and `elections.ts`; `people.ts` moves one cube for relocation and housing. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants.
  - `ui/`: the board. `map/` draws the Metro map and pieces; `panels/` are the side panels; `rulesSheet/` is the full rules behind the Rules button; `useTurnControls.ts` turns the phase into clickable targets; `viewer.tsx` holds who is looking and the colour each player is drawn in.
- `src/game.config.ts`: the game's `GameConfig` (id, title, tagline, Supabase settings from `.env.local`).
- `src/App.tsx`: renders `<TurnBasedGameApp config={GAME_CONFIG} game={game} />`; GameKit routes on the URL (`?room=CODE[&mode=async]`).
- `src/index.css`: imports GameKit's theme and sets the Barlow font. GameKit's default palette is the Metro look.

### Rules contract (GameKit's turn-based contract)

- `createInitialState({ settings, playerCount, seed })` and `applyMove(state, move)` must be pure and deterministic. Randomness (the bag) uses GameKit's seeded `nextIndex`, with the generator state kept in the game state, so every client draws the same cubes.
- `activePlayer(state)` names the seat whose move the game awaits (null once over). A turn may take several moves; GameKit only applies moves from the active player.
- `applyMove` throws GameKit's `IllegalMoveError` for a move that breaks the rules; GameKit catches it and leaves the state alone.
- Bump `RULES_VERSION` (`rules/types.ts`) whenever the rules or the state's shape change. Saved async games, and rooms created by a browser still on an older deploy (GitHub Pages caches for about 10 minutes), then show a "different version" message instead of crashing.

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
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference. `src/game/map/` ports its map data and district derivation, `src/game/ui/theme.ts` its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe colours, and `src/game/rules/elections.ts` its seat allocation. Change the map in the asset generator first, then port it. The map draws only the station sites in use at the player count, since the rest are ordinary hexes.
- **In-game rules:** `src/game/ui/rulesSheet/` ports the asset generator's rules sheet (`src/rules/`: `rulesContent.js`, `examples.js` and its figures) as real text and SVG, drawn with the game's own map and pieces, and with player colours by their in-game names (Cobalt, Saffron, Orchid, Jade). When the sheet there changes, bring this in line; `examples.test.ts` checks the examples against the game's rules.
- **Rule interpretations** the draft doesn't settle, chosen here (revisit with the designer):
  - A School's relocation: the active player picks each person (any colour, from any Residence or Station, including another Residence next to the School) and which owed Residence they go to, in any order. A Residence across a district line counts as next to the School. A Residence goes without only if nobody is left elsewhere on the board.
  - Immigration draws one person at a time, and the Station's owner pays their cube in before the next draw, so the bag never shrinks. A bag that starts empty (only possible at extreme dial settings) brings nobody.
  - Housing runs every turn, across the whole board: the active player picks each person (Station and colour) and their Residence, one at a time, until nobody waiting has space in their city. When only one move is possible it happens by itself. People who don't fit keep waiting for a later turn.
  - Housing comes before the merger, so people only move into the merged city's new space on the next turn's housing.
  - A tile touching several other cities merges them all in one election, with one merger marker per city joined. The game ends with the election that leaves one city.
  - Players tied with grey for a city's most seats still score; grey blocks only when it leads alone.
  - The tiebreak's "cubes on the board" counts people waiting at Stations too.
  - Public tiles never run out. A player with no legal placement passes; a full round of passes ends the game.
