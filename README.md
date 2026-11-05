# Votes

Build districts, bring people in and shift them about, win the seats when cities merge. A game of development and vote manipulation for 3–5 players.

Play it at [poeticmatter.github.io/Votes](https://poeticmatter.github.io/Votes/). Part of the [game lab](https://poeticmatter.github.io/game-lab/), built from [poeticmatter/game-template](https://github.com/poeticmatter/game-template).

- **Game id:** `votes` (Supabase table `votes_games` in the shared `game-lab` project)
- **Status:** first playable version for 3–5 players: async (Supabase), live (PeerJS) and a solo playtest (see [docs/solo-playtest.md](docs/solo-playtest.md)). Rules follow Draft 5.13 ([docs/rules-draft-5.13.md](docs/rules-draft-5.13.md), with a [player aid](docs/player-aid-5.13.md)), which replaces the asset repo's draft (`VotesAssets/Rules/Votes.md`, still 5.11) once it's been tested; the bracketed numbers are adjustable under "Playtest dials" in the lobby.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm test         # vitest
npm run build
npm run deploy   # build and publish to GitHub Pages (gh-pages branch)
```
