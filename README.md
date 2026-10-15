# Votes

Build districts, bring in families, win the seats when cities merge. A cube rail game for 2–5 players.

Play it at [poeticmatter.github.io/Votes](https://poeticmatter.github.io/Votes/). Part of the [game lab](https://poeticmatter.github.io/game-lab/), built from [poeticmatter/game-template](https://github.com/poeticmatter/game-template).

- **Game id:** `votes` (Supabase table `votes_games` in the shared `game-lab` project)
- **Status:** first playable version for 2–5 players: async (Supabase), live (PeerJS) and hot seat. Rules follow the draft in the asset repo (`VotesAssets/Rules/Votes.md`); the bracketed numbers are adjustable under "Playtest dials" in the lobby.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm test         # vitest
npm run build
npm run deploy   # build and publish to GitHub Pages (gh-pages branch)
```
