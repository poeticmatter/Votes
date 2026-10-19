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
  - `map/`: map content (`mapData.ts`: mountains, town sites, the rail) and everything derived from it (`board.ts`: town sites, rail sides, adjacency, the order the rail passes the Stations and so which are one stop apart).
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn through `placement.ts`, `relocation.ts` (Schools), `immigration.ts` (Factories), `housing.ts`, `mergers.ts` and `elections.ts`; `cities.ts` reads the cities off the tiles; `people.ts` moves one cube for relocation and housing. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants.
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
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference for the look: `src/game/ui/theme.ts` ports its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe player colours, and `src/game/rules/elections.ts` its seat allocation. The map lives here first: `src/game/map/mapData.ts` has the town sites (each a starting Residence with its printed Station beside it, on the rail) and the one rail line, which snakes from the south edge past E, C, B, A and D; the only terrain is mountains. The order the rail passes the Stations (E, C, B, A, D) decides which are one stop apart, so moving the rail can change the rules. The asset generator's map still shows Draft 5.4's districts and station sites.
- **In-game rules:** `src/game/ui/rulesSheet/` is the rules sheet, first ported from the asset generator's (`src/rules/`) and since rewritten for Draft 5.8, as real text and SVG drawn with the game's own map and pieces, with player colours by their in-game names (Cobalt, Saffron, Orchid, Jade). `examples.test.ts` checks the examples against the game's rules.
- **Rule interpretations** the draft doesn't settle, chosen here (revisit with the designer):
  - Cities are never stored: a city is a group of connected tiles and Stations, named by the towns whose starting Residence it holds. A tile that touches two or more cities joins them the moment it is placed, so that turn's immigration and housing already use the merged city; the merger step then puts out the markers and holds the election. (The draft lists housing before the merger.)
  - A tile touching several cities has the first one it touches, in side order, as its own; there is one merger marker per other city, on the edge to that city. The game ends with the election that leaves one city.
  - People move within their city, or from a neighboring city: two cities are neighbors if any of their Stations are one stop apart by rail (the rail passes the Stations in order E, C, B, A, D, so each town neighbors the next, and a merged city neighbors whatever any of its towns neighbors). This covers every move, housing and School relocation alike. A person from within the city earns the active player 1 cube for the bag; one from a neighboring city earns none, however many.
  - A School must relocate 1 person when it can: from any Residence or Station in the receiving Residence's city or a neighboring one, into one adjacent Residence that touches no other School, even a full one. It relocates nobody when no such Residence exists or nobody can reach it.
  - A Factory's people all arrive at one Station in its city. The player chooses when the city has more than one; otherwise it happens by itself. They are drawn one at a time, and if the bag runs out the rest don't come.
  - Housing runs every turn, across the whole board: the active player picks each person (Station and colour) and their Residence, one at a time, until nobody waiting has room anywhere they may go. When only one move is possible it happens by itself, People who don't fit keep waiting for a later turn.
  - People sit in a row in a Residence, newcomers on the right. A tied seat goes to the tied colour that appears furthest left (grey included); an empty Residence counts for nobody. When a colour leaves a Residence, its leftmost person goes. Players tied with grey for a city's most seats still score; grey blocks only when it leads alone.
  - Grey cubes exist only at setup (10 minus 2 per player, on the starting Residences). The bag holds only player colours, so Factories can drain it; once empty nobody arrives.
  - The tiebreak's "cubes on the board" counts people waiting at Stations too.
  - Tiles never run out. A player with no legal placement passes; a full board is one city, so the game has ended by then.
