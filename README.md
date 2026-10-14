# Game Template

The starting point for every game in the [game lab](https://poeticmatter.github.io/game-lab/). You get a two-player, simultaneous-turn web game with:

- **Live play** over PeerJS (peer to peer, no server), with spectators
- **Async play** backed by Supabase (turns are saved, so players can move at any time)
- **Hot seat**: both players share one device, with a pass-the-device screen between inputs
- A lobby, share links, reconnection, and GitHub Pages deployment

The example game in `src/game/` is rock-paper-scissors. Replace it with your own.

## Starting a new game

1. On GitHub, click **Use this template → Create a new repository** (for example `poeticmatter/SpiralDuel`), then clone it.
2. Name the game:
   ```bash
   npm install
   npm run init-game -- SpiralDuel spiral "Spiral Duel"
   ```
   This sets the Pages path, the title, and the game id. The game id names the Supabase table (`spiral_games`), and it prefixes the PeerJS room ids and localStorage keys so lab games never collide.
3. Run the renamed migration in `supabase/migrations/` in the shared Supabase project (Dashboard → SQL editor).
4. Copy `.env.local` from any other lab game (every game uses the same Supabase project).
5. Replace `src/game/` with your game, update this README, then run `npm run deploy`.
6. Add the game to the hub's `games.json` in [poeticmatter/game-lab](https://github.com/poeticmatter/game-lab).

## Structure

```
src/
├── game.config.ts   # game id, title, Supabase table name
├── game/            # THE GAME: replace this folder
│   ├── index.ts     #   exports `game: GameModule` (the only thing the platform imports)
│   ├── rules.ts     #   pure, deterministic createInitialState / resolveTurn
│   ├── Board.tsx    #   renders state, calls onSubmitPlan
│   └── SettingsForm.tsx
├── platform/        # game-agnostic: lobby, transports, screens
│   ├── types.ts     #   GameModule / GameRules contracts
│   ├── usePeerHost.ts, usePeerGuest.ts   # live play (commit-and-hold)
│   ├── useAsyncMatch.ts, asyncMatchApi.ts # async play
│   ├── useHotSeatMatch.ts                 # hot seat (one device, offline)
│   └── Lobby.tsx, StatusScreens.tsx, roomLink.ts
└── App.tsx          # wires the game into the platform
```

### The game contract

A game provides a `GameModule` (see `src/platform/types.ts`):

- `rules.createInitialState(settings)` and `rules.resolveTurn(state, p1Plan, p2Plan)`. These must be **pure and deterministic**, because in async play either client may resolve a turn.
- The state and every plan carry `turn: number`, which the transports use to reject stale plans.
- `Board` receives `state`, `role` (`1 | 2 | 'spectator'`), `hasCommitted`, `onSubmitPlan` and `seating`. In hot seat, `seating` is `'hot_seat'` and `role` is whichever player holds the device, so name players by number rather than "You".
- `SettingsForm` edits the settings in the lobby.

The platform is copied into each game rather than shared as a package. Change it freely for a particular game.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm run build
npm run deploy   # build and publish to GitHub Pages (gh-pages branch)
```
