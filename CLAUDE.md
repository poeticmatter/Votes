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

Votes: a 3–5 player, take-turns-in-order browser game with no backend of its own. It is part of the game lab (poeticmatter/game-lab). Its multiplayer platform (lobby, seats, async and live play, the solo playtest) comes from **GameKit** (`game-kit/turns`), a package pinned in `package.json` to a release tag of poeticmatter/GameKit (local copy: `C:\Code\GameKit`).

- `src/game/`: the game, and `index.ts` exporting `game: GameModule`.
  - `map/`: map content (`mapData.ts`: mountains, town sites, printed Factories, the rail) and everything derived from it (`board.ts`: town sites, rail sides, adjacency).
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn through `placement.ts` (the tile supply, Mines on mountains), `relocation.ts` (Schools), `immigration.ts` (Factories and Mines), `housing.ts`, `mergers.ts` and `elections.ts` (with the payout table in `payout.ts`); `cities.ts` reads the cities off the tiles; `people.ts` moves one cube for relocation and housing. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants.
  - `ui/`: the board. `map/` draws the Metro map and pieces; `panels/` are the side panels; `rulesSheet/` is the full rules behind the Rules button; `useTurnControls.ts` turns the phase into clickable targets; `viewer.tsx` holds who is looking and the colour each player is drawn in.
- `src/game.config.ts`: the game's `GameConfig` (id, title, tagline, Supabase settings from `.env.local`).
- `src/App.tsx`: renders `<TurnBasedGameApp config={GAME_CONFIG} game={game} />`; GameKit routes on the URL (`?room=CODE[&mode=async]`).
- `src/index.css`: imports GameKit's theme and sets the Barlow font. GameKit's default palette is the Metro look.

### Rules contract (GameKit's turn-based contract)

- `createInitialState({ settings, playerCount, seed })` and `applyMove(state, move)` must be pure and deterministic. Randomness (the bag) uses GameKit's seeded `nextIndex`, with the generator state kept in the game state, so every client draws the same cubes.
- `activePlayer(state)` names the seat whose move the game awaits (null once over). A turn may take several moves; GameKit only applies moves from the active player.
- `applyMove` throws GameKit's `IllegalMoveError` for a move that breaks the rules; GameKit catches it and leaves the state alone.
- `irreversibleReason(state, move)` (in `rules/index.ts`, via `drawsFromBag` in `turnFlow.ts`) marks moves that draw cubes from the bag. GameKit warns before such a move, and once it is played neither it nor the moves before it this turn can be undone; every other move can, in the solo playtest, async and live play alike. Needs GameKit 0.5.0 or later.
- Bump `RULES_VERSION` (`rules/types.ts`) whenever the rules or the state's shape change. Saved async games, and rooms created by a browser still on an older deploy (GitHub Pages caches for about 10 minutes), then show a "different version" message instead of crashing.

### Seats and transports (in GameKit)

- Seat i joins in order and plays `PLAYER_COLORS[i]`. The first player is drawn from the seed.
- **Async (Supabase)**: one row per room in `votes_games` (`players`, `player_count`, `state`, `version`); seats are claimed through the `votes_claim_seat` RPC. Both are defined by this repo's `supabase/migrations/`.
- **Live (PeerJS)** needs nothing from this repo beyond `GAME_CONFIG.id`.
- **Solo playtest** (`'solo_playtest'`, "Solo Playtest" in the lobby): one tester plays several tables at once, dealt a random seat each turn, and the dealt seat always wears seat 0's colour (Orchid) while the others' colours are shuffled. The board draws, names and orders every player colour through `BoardProps.lookOf` (via `ui/viewer.tsx`: `usePieceColorOf`, `useByLook`), never `PIECE_COLORS[color]` directly; lists of players start from the viewer's seat. `rules.outcome` gives the summary its winners and scores. `docs/solo-playtest.md` explains the colour swap for other games to copy; keep it in step with GameKit and `viewer.tsx`.
- To change platform behaviour, change GameKit, tag a release, and bump the `game-kit` version in `package.json`. Don't patch `node_modules/game-kit`.

## Rules

- All state changes go through `rules.applyMove`. UI components only render state and submit moves.
- Keep `GAME_CONFIG.id` and the table and function names in `supabase/migrations/` in sync. New migrations are applied to project `zavdrnttsfcupopdidda` under the name `votes_<number>_…`.

## Votes

- **Rules:** `C:\Code\assets\VotesAssets\Rules\Votes.md` is the current draft and the source of truth. Values in [brackets] are playtest dials and live in `VotesSettings` (the lobby's "Playtest dials").
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference for the look: `src/game/ui/theme.ts` ports its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe player colours, and `src/game/rules/elections.ts` its seat allocation. The map is drawn in the asset generator (`src/map/mapData.js`, with its map editor in `src/editor`) and ported here: `src/game/map/mapData.ts` has the town sites (each a starting Residence with its printed Station beside it, on the rail), the printed Factories (`STARTING_FACTORIES`, each beside a town's tiles so it begins in that town's city) and the one rail line, which snakes from the south edge up the east side and back west and south, passing every Station; the only terrain is mountains, where only Mines go. The rail decides which hexes border it, which matters to Factory values, so moving it can change the rules. Rules tests find their hexes through `rules/testMap.ts` (a hex touching only a Station, a chain of tiles joining two towns, and so on), so a map change shouldn't need them edited.
- **In-game rules:** `src/game/ui/rulesSheet/` is the rules sheet, first ported from the asset generator's (`src/rules/`) and since rewritten for Draft 5.10, as real text and SVG drawn with the game's own map and pieces, with player colours by their in-game names (Cobalt, Saffron, Orchid, Jade). `examples.test.ts` checks the examples against the game's rules.
- **Rule interpretations** the draft doesn't settle, chosen here (revisit with the designer):
  - Cities are never stored: a city is a group of connected tiles and Stations, named by the towns whose starting Residence it holds. A tile that touches two or more cities joins them the moment it is placed, so that turn's immigration and housing already use the merged city; the merger step then puts out the markers and holds the election. (The draft lists housing before the merger.)
  - A tile touching several cities has the first one it touches, in side order, as its own; there is one merger marker per other city, on the edge to that city. The game ends with the election that leaves one city.
  - Every person who moves into a Residence, by housing or a School, earns the active player 1 cube for the bag.
  - A School must relocate 1 person when it can, into one adjacent Residence that touches no other School, even a full one. The person comes from anywhere on the board, in any city: any Residence that touches no School (the new one included), or any Station. It relocates nobody when no such Residence exists or nobody can be taken.
  - A Factory's or Mine's people all arrive at one Station in its city. The player chooses when the city has more than one; otherwise it happens by itself. They are drawn one at a time, and if the bag runs out the rest don't come.
  - Housing runs every turn, across the whole board: the active player picks each person (Station and colour) and a Residence in the Station's city, one at a time, until nobody waiting has room in their city. When only one move is possible it happens by itself. People who don't fit keep waiting for a later turn.
  - People sit in a row in a Residence, newcomers on the right. A tied seat goes to the tied colour that appears furthest left (grey included); an empty Residence belongs to nobody. When a colour leaves a Residence, its leftmost person goes.
  - Payout: the city's value is its Factories (1, +1 bordering the rail, +1 touching a Mine, read when the city votes) and Mines (2); the table in `payout.ts` gives points per seat from that and the city's seats, empty and grey ones included. A lone town (1 seat) never votes; the cities panel previews it in the table's first column.
  - Grey cubes: the starting Residences take 10 minus 2 per player; the rest of the [10] go in the bag (all 10 with 5 players). The bag can run dry; once empty nobody arrives.
  - The tile supply ([15] Residences, [10] Factories, [5] Mines, [5] Schools) is shared and counted in the state; the printed Factory is extra. A kind that has run out can't be placed. Random play often uses every tile before the 4th election, so the game also ends once a full round of players has passed (nothing can be placed); most points wins as usual.
  - The tiebreak's "cubes on the board" counts people waiting at Stations too.
  - The map prints a Factory beside E's Station (the draft doesn't mention printed Factories); it starts on the board and scores for its city like any other.
  - A player with no legal placement passes. Merger markers stay on the digital board as a record, though the draft no longer has them.
