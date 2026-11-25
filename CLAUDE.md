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

Votes: a 3–5 player, take-turns-in-order browser game with no backend of its own. It is part of the game lab (poeticmatter/game-lab). Its multiplayer platform (lobby, seats, async and live play, the solo playtest) comes from **GameKit** (`game-kit/turns`), a package pinned in `package.json` to a release tag of poeticmatter/GameKit (local copy: `C:\Code\digital-board-games\GameKit`).

- `src/game/`: the game, and `index.ts` exporting `game: GameModule`.
  - `map/`: map content (`mapData.ts`: mountains, town sites, printed Factories) and everything derived from it (`board.ts`: town sites, adjacency).
  - `rules/`: pure rules. `turnFlow.ts` (`applyMove`) runs a turn: `placement.ts` (placing from the player's own supply, owned by the placer, one School per city), `arrivals.ts` (a placed Factory's draw from the bag; a merger's arrival in every Residence), `mergers.ts` and `elections.ts` (1 point per seat per Factory; a cube per seat won), then `pulls.ts` (the player's voluntary pulls and the cubes they put in the bag) until the player ends the turn; `cities.ts` reads the cities off the tiles. Tests sit beside them; `fullGame.test.ts` plays seeded games end to end and checks invariants (tiles are never made or lost, and cubes only enter through the bag's logged additions); `legalMoves.ts` lists every move the active player could make, for the bot and tests.
  - `bot/`: the computer player behind `GameModule.bot` (GameKit 0.8.0+), which the lobby can seat in async and live games. It is heuristic, not a search: `chooseBotMove` values every legal move (`rules/legalMoves.ts`) by the board as it stands and plays the best, the first in the rules' order on a tie, so every browser playing it picks the same move. `seatValues.ts` values pulls by the seats they win or lose, weighted by the city's Factories; `placementValues.ts` values placements (a merger by the election it would hold now, and the last merger by whether the bot would win; a Residence as a seat it can pull into; a Factory by the cubes it draws and the bot's lead in its city), with its dials as named constants. Ending the turn is listed first and worth 0, so the bot pulls only while a pull gains it something. It never plays moves out, so it never sees a draw before it happens. `bot.test.ts` plays bots against each other and against random players.
  - `scripts/simulate/` (`npx vite-node scripts/simulate/run.ts -- <games> <out.json>`) plays bot games of the rules and prints the measures; add entries to its `VARIANTS` to compare dials. `docs/simulations.md` holds the results, including the earlier proposed rule sets (Hubs, Ports, Town Halls, place-only turns), which were removed from the code on 2026-11-23 and live on in git history.
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

## Rules document and design log

Claude keeps two documents in `docs/` and updates them in the same change as the work they describe, without being asked:

- **`docs/rules.md`**: the game's rules as it plays them now, in plain language, as a new player would read them: what you're trying to do, what's on the table, setup, a turn, how it ends. No code names, file paths or jargon. Every change to the rules or content updates it, so it always matches the game.
- **`docs/design-log.md`**: what changed and why, newest first, in two sections:
  - **Game design**: the game itself: rules, content (map, tiles, cards, numbers and dials) and balance.
  - **Game development**: everything else: the board and UI, visuals, GameKit bumps, bots, tooling, and fixes that don't change the rules.

  One entry per change, headed by its date and a short title, in the section it belongs to; a change that does both gets an entry in each. Say what changed for players and, when it's known, why. Leave how it was built to the commits.

In Votes, `docs/rules.md` is separate from the designer's draft (`docs/rules-draft-5.13.md`): the draft stays the designer's text, while `rules.md` describes what the game plays, the rule interpretations below included.

## Rules

- All state changes go through `rules.applyMove`. UI components only render state and submit moves.
- Keep `GAME_CONFIG.id` and the table and function names in `supabase/migrations/` in sync. New migrations are applied to project `zavdrnttsfcupopdidda` under the name `votes_<number>_…`.

## Votes

- **Rules:** the game plays Draft 5.13 (`docs/rules-draft-5.13.md`, with its player aid, `docs/player-aid-5.13.md`) as changed by the designer on 2026-11-23 to 25: players' own tiles (15 Residences, 5 Factories, 1 School), placed face up and owned by the placer (no taking, flipping, promises or Universities); a placed Factory draws 5 cubes from the bag; people move only when the active player pulls them into their own Residences or the starting ones; two printed Factories; cubes into the bag for Factory and School owners as people are pulled, and per seat won at a merger; a person into each Residence after a merger; a bag seeded with 20 cubes. `docs/rules.md` describes it in full. The draft will replace `C:\Code\assets\VotesAssets\Rules\Votes.md` (still Draft 5.11) as the source of truth once the designer signs it off. Don't update the asset repo until then. Earlier drafts are tagged `draft-5.11` and `draft-5.12` here, and `docs/rules-draft-5.12.md` keeps 5.12's text. Values in [brackets] are playtest dials and live in `VotesSettings` (the lobby's "Playtest dials").
- **Board and visuals:** the asset generator at `C:\Code\assets\VotesAssets` (local only) is the reference for the look: `src/game/ui/theme.ts` ports its Metro theme, `src/game/ui/pieceColors.ts` its colour-blind-safe player colours, and `src/game/rules/elections.ts` its seat allocation. The map is drawn in the asset generator (`src/map/mapData.js`, with its map editor in `src/editor`) and ported here: `src/game/map/mapData.ts` has the town sites (each a starting Residence) and the printed Factories (`STARTING_FACTORIES`, beside E and B, chosen here rather than in the asset generator); the only terrain is mountains, where nothing goes. Draft 5.12 removed the rail and Stations, but the asset generator's map is still 5.11's: when porting a map from it, take only its mountains and towns, and keep these printed Factories. Rules tests find their hexes through `rules/testMap.ts` (a hex touching only one tile, a chain of tiles joining two towns, and so on), so a map change shouldn't need them edited.
- **In-game rules:** `src/game/ui/rulesSheet/` is the rules sheet, first ported from the asset generator's (`src/rules/`) and since rewritten for the current rules, as real text and SVG drawn with the game's own map and pieces, with player colours by their in-game names (Cobalt, Saffron, Orchid, Jade). `examples.ts` plays the pulling examples out through the rules' own pulls, and `examples.test.ts` checks the rest against the game's rules.
- **Rule interpretations** the rules don't settle, chosen here (revisit with the designer):
  - Cities are never stored: a city is a group of connected tiles, named by the towns whose starting Residence it holds. A tile that touches two or more cities joins them the moment it is placed; the merger step then puts out the markers and holds the election.
  - A tile touching several cities has the first one it touches, in side order, as its own; there is one merger marker per other city, on the edge to that city. The game ends with the election that leaves one city.
  - Residences have no capacity. The board draws people (and a Factory's cubes) in rows of 3, stacking upwards. A placed tile wears its owner's colour as its outline.
  - A turn: place one tile from your own supply (phase `action`), or pass if none fits; then pull (phase `pulling`) as often as you like, and end the turn with `endTurn`. A player who passed still pulls.
  - Turn order: placement, then a Factory's draw of 5 from the bag (fewer if the bag runs short), then the merger (election, then 1 person from the bag into each Residence of the merged city, in board order, while the bag lasts, then 1 cube per seat won into the bag for each player, after the arrivals so none of them can arrive that turn), then pulls. The last merger ends the game at once.
  - A pull moves one cube into a Residence the active player owns, or a starting one (owned by nobody): from a Factory while the Residence holds fewer than 3, or from a Residence with at least 2 more people. From the same city, or from any city if the destination's city has a School; that includes other cities' Factories. A cube pulled from a Factory has its owner add 1 cube of theirs to the bag, or a grey one for a printed Factory. A person brought from another city has a School owner in the destination's city add 1 of theirs; with several owners, the pull names (`credit`) whose. Pulls always run out (see `pulls.ts`).
  - The active player makes every choice in their turn, whoever's cubes are involved. Nothing moves by itself.
  - A School can't be placed touching any city that has one, so it can't join one either; two Schools can share a city only after a merger.
  - People sit in a row in a Residence, newcomers on the right. Grey people never vote: a seat goes to the player colour with the most people there, and a tie to the tied player colour furthest left, skipping any grey. A Residence where nobody votes (empty or all grey) belongs to nobody. When a colour leaves a Residence (or a Factory), its leftmost cube goes.
  - Payout: each Residence is a seat, whoever owns it, and scores its holder 1 point per Factory in the city, printed ones included. A lone town never votes.
  - Setup: [2] of each player's colour topped up with grey to 10 are dealt 2 to each starting Residence, and the same again for the printed Factories, less 1 grey per printed Factory, which goes on the right of that town's starting Residence (4 cubes per Factory); with 5 players the Factories' cubes hold no grey, so those greys come from outside and the Factories get 5 each; the bag starts with [4] of each player's colour and grey to [20].
  - The game ends after the election that leaves one city, or once a full round of players has passed (no tile of theirs fits); most points wins as usual.
  - Merger markers stay on the digital board as a record, though the draft no longer has them.
