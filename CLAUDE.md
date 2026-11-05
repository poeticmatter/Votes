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
  - `map/`: map content (`mapData.ts`: mountains, town sites, printed Factories) and everything derived from it (`board.ts`: town sites, adjacency).
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn's one action: `actions.ts` (taking a tile, the promises of face-down placements, flipping), `placement.ts` (placing from a player's own supply, one School per city), then `immigration.ts` (a flipped Factory bringing 1 person per city), `movement.ts` (levelling, then School and University pulls), `mergers.ts` and `elections.ts` (1 point per seat per face-up Factory); `cities.ts` reads the cities off the tiles; `people.ts` moves one cube between Residences. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants.
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

- **Rules:** the game plays Draft 5.13, which lives in `docs/rules-draft-5.13.md` (with its player aid, `docs/player-aid-5.13.md`) while it's tested; it will replace `C:\Code\assets\VotesAssets\Rules\Votes.md` (still Draft 5.11) as the source of truth once the designer signs it off. Don't update the asset repo until then. Earlier drafts are tagged `draft-5.11` and `draft-5.12` here, and `docs/rules-draft-5.12.md` keeps 5.12's text. Values in [brackets] are playtest dials and live in `VotesSettings` (the lobby's "Playtest dials").
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference for the look: `src/game/ui/theme.ts` ports its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe player colours, and `src/game/rules/elections.ts` its seat allocation. The map is drawn in the asset generator (`src/map/mapData.js`, with its map editor in `src/editor`) and ported here: `src/game/map/mapData.ts` has the town sites (each a starting Residence) and the printed Factories (`STARTING_FACTORIES`, each beside a town's Residence so it begins in that town's city); the only terrain is mountains, where nothing goes. Draft 5.12 removed the rail and Stations, but the asset generator's map is still 5.11's and has both: when porting a map from it, take its mountains, towns and printed Factories, not its rail or Stations. Rules tests find their hexes through `rules/testMap.ts` (a hex touching only one tile, a chain of tiles joining two towns, and so on), so a map change shouldn't need them edited.
- **In-game rules:** `src/game/ui/rulesSheet/` is the rules sheet, first ported from the asset generator's (`src/rules/`) and since rewritten for Draft 5.13, as real text and SVG drawn with the game's own map and pieces, with player colours by their in-game names (Cobalt, Saffron, Orchid, Jade). `examples.ts` plays the moving examples out through the rules' own movement, and `examples.test.ts` checks the rest against the game's rules.
- **Rule interpretations** the draft doesn't settle, chosen here (revisit with the designer):
  - Cities are never stored: a city is a group of connected tiles, named by the towns whose starting Residence it holds. A tile that touches two or more cities joins them the moment it is placed, so that turn's immigration and movement already use the merged city; the merger step then puts out the markers and holds the election, after everyone has moved.
  - A tile touching several cities has the first one it touches, in side order, as its own; there is one merger marker per other city, on the edge to that city. The game ends with the election that leaves one city.
  - Residences have no capacity; one with 4+ people is overcrowded. The board draws people in rows of 3, stacking upwards.
  - A turn is one action (phase `action`): take a Factory or School from the shared supply into your own (never a Residence; you get those at setup and from placing Factories), place a tile from your own supply, or flip a tile. Players start with 2 Residence tiles, taken out of the shared [15].
  - Residences and Factories are placed face down, Schools face up. A face-down tile is still a tile: it joins and merges cities, and its placement holds the election. A face-down Residence is no seat and holds nobody; a face-down Factory brings nobody and scores nothing. Anyone may flip any face-down tile.
  - A face-down Residence's promise adds 1 of the placer's cubes to the bag per overcrowded face-up Residence in its city (after any merger it makes). A face-down Factory gives the placer 2 Residence tiles from the shared supply, or what's left.
  - A flipped Factory draws 1 person per city on the board, a city at a time in order of first town, each into that city's least crowded face-up Residence; when Residences tie, the game stops with the drawn person shown (phase `arrival`) for the player to choose. Every city holds a starting Residence, face up from the start, so nobody ever has to wait. Each arrival adds 1 of the active player's cubes to the bag (the 5.13 brief removed votes only for moving). If the bag runs out the rest don't come.
  - Movement (phase `movement`) runs only after a flip or a School placement, until nobody can move: levelling (to a Residence in the same city with at least 2 fewer people) while any is possible, then pulls. A city pulls from cities that rank lower (no School, then School, then University) into a Residence with fewer people. Each step takes the most crowded source, then the least crowded destination; the player breaks any remaining tie and picks the colour, and a move that is the only one possible happens by itself. Moving adds nothing to the bag. It always ends (see the note in `movement.ts`).
  - A School can't be placed touching any city that has one, so it can't join one either; cities that each have a School may still merge through other tiles, and only then can a School be flipped into a University (any School in a city with two or more Schools and Universities).
  - People sit in a row in a Residence, newcomers on the right. Grey people never vote: a seat goes to the player colour with the most people there, and a tie to the tied player colour furthest left, skipping any grey. A Residence where nobody votes (empty or all grey) belongs to nobody. When a colour leaves a Residence, its leftmost person goes.
  - Payout: each face-up Residence is a seat, and scores its holder 1 point per face-up Factory in the city. A lone town never votes.
  - Grey cubes: the starting Residences take 10 minus 2 per player; the rest of the [10] go in the bag (all 10 with 5 players).
  - The game ends after the election that leaves one city, or once a full round of players has passed (nobody can take, place or flip); most points wins as usual.
  - The map prints a Factory beside E's starting Residence, on the hex where E's Station was before 5.12 (the draft doesn't mention printed Factories); it starts face up and scores for its city like any other.
  - A player with no legal placement passes. Merger markers stay on the digital board as a record, though the draft no longer has them.
