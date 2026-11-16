# Simulating the proposed rules

*2026-11-15. Bots played 800 games of each rule set: 600 bot-only games (200 each at 3, 4 and 5 players), and 200 games with one bot against three sloppy players. The rules are switched on through options on the `explore/new-rules` branch, and Draft 5.13 still plays by default. To rerun: `npx vite-node scripts/simulate/run.ts -- 200 out.json all` (or a comma-separated list of the ids below).*

There were three rounds. **Round 3 is the current one**: a turn is only placing a tile, and a Factory brings 2 people to its own city. Round 2 had the same turns with a Factory drawing for every city. Round 1 kept 5.13's taking and flipping, and is kept below for the record, along with how each measure is defined ("How 'interesting' was measured").

## Round 3: Factories bring people to their own city

*2026-11-16. Same method as before: 600 bot-only games and 200 against sloppy players per set. To rerun: `npx vite-node scripts/simulate/run.ts -- 200 out.json own` (every tile combination) or `catchup` (the catch-up grid).*

### What changed from round 2

- **A placed Factory brings 2 people from the bag for its own city**, not 1 for every city. Each one can settle in any city that a Hub joins to the Factory's city (both cities need a Hub, as for movement). It goes to the best-schooled of those cities (a School beats none; with no flips there are no Universities), into that city's least crowded Residence. The placer picks when Residences tie, even across cities. Then everyone moves, as before.
- **Arrivals add no cubes** in every set (round 2's "quiet"). The bag grows only by the placed tiles' cubes: Residence 1, Factory 2, Port 3.
- Everything else is as in round 2: place-only turns, 8 Residences, 2 Factories and 1 School each, and 1 of each new tile in play.
- **Catch-up cubes, with the second player getting fewer than later players**: later players start with extra cubes of their own colour in the bag. The schedules tested give 0 to the first player, then:
  - "c01122": 1, 1, 2, 2 (round 2's "half");
  - "c01222": 1, 2, 2, 2;
  - "c01233": 1, 2, 3, 3;
  - "c01234": 1, 2, 3, 4;
  - "c00112": 0, 1, 1, 2.

Ids: **F** is the round 3 base. "+hub", "+port", "+ed" and "+hall" add Hubs, Ports, eminent domain and Town Halls. Eminent domain was removed from the rules after these runs, so the "+ed" rows are for the record. The first row is round 2's recommended set, for comparison.

### Results: every tile combination, no catch-up cubes

| Rule set | Turns | Elections | Winner's points | Close finishes | Lead changes | Comebacks | Seat bias (pts) | First player's edge | Bot vs sloppy | People at end |
|---|---|---|---|---|---|---|---|---|---|---|
| P+hall quiet half (round 2) | 26 | 6.8 | 103 | 11% | 1.49 | 54% | 5.5 | 0.99x | 66% | 46 |
| F | 24 | 3.9 | 81 | 15% | 0.69 | 37% | 10.6 | 1.43x | 43% | 25 |
| F+hall | 24 | 6.7 | 79 | 14% | 1.28 | 50% | 7.9 | 1.32x | 49% | 25 |
| F+ed | 27 | 3.9 | 83 | 9% | 0.57 | 29% | 9.4 | 1.36x | 39% | 26 |
| F+ed+hall | 27 | 6.7 | 76 | 10% | 1.29 | 54% | 8.9 | 1.30x | 48% | 26 |
| F+port | 27 | 4.0 | 98 | 7% | 0.60 | 40% | 12.8 | 1.49x | 64% | 44 |
| F+port+hall | 28 | 6.7 | 97 | 6% | 1.46 | 63% | 13.9 | 1.51x | 61% | 44 |
| F+port+ed | 29 | 4.0 | 98 | 5% | 0.58 | 39% | 18.5 | 1.72x | 55% | 45 |
| F+port+ed+hall | 30 | 6.8 | 93 | 3% | 1.42 | 62% | 10.4 | 1.39x | 55% | 44 |
| F+hub | 24 | 4.0 | 83 | 14% | 0.69 | 37% | 10.8 | 1.44x | 51% | 25 |
| F+hub+hall | 24 | 6.7 | 80 | 14% | 1.29 | 49% | 7.8 | 1.32x | 53% | 25 |
| F+hub+ed | 30 | 3.9 | 73 | 8% | 0.65 | 35% | 8.9 | 1.36x | 49% | 26 |
| F+hub+ed+hall | 29 | 6.8 | 67 | 8% | 1.34 | 50% | 9.1 | 1.35x | 55% | 26 |
| F+hub+port | 27 | 4.0 | 99 | 7% | 0.60 | 41% | 12.8 | 1.48x | 69% | 44 |
| F+hub+port+hall | 28 | 6.7 | 98 | 6% | 1.46 | 63% | 13.9 | 1.51x | 65% | 44 |
| F+hub+port+ed | 32 | 4.0 | 86 | 5% | 0.66 | 46% | 16.1 | 1.64x | 59% | 45 |
| F+hub+port+ed+hall | 32 | 6.9 | 79 | 5% | 1.45 | 61% | 9.4 | 1.33x | 60% | 44 |

Hubs were placed 0.0–0.3 times a game without eminent domain, and about 4 times with it, mainly as the tile built over Residences. Cities still merged in 90–100% of games.

### Results: catch-up cubes

| Rule set | Close finishes | Lead changes | Comebacks | Seat bias (pts) | First player's edge | Bot vs sloppy |
|---|---|---|---|---|---|---|
| F c01122 | 14% | 0.65 | 34% | 7.8 | 1.06x | 47% |
| **F c01222** | 13% | 0.68 | 34% | **3.4** | 0.95x | 40% |
| F c01233 | 13% | 0.66 | 34% | 2.6 | 0.92x | 41% |
| F c01234 | 13% | 0.65 | 33% | 4.1 | 0.90x | 41% |
| F c00112 | 13% | 0.64 | 33% | 8.4 | 1.26x | 45% |
| F+hall c01122 | 13% | 1.26 | 50% | 4.1 | 0.92x | 49% |
| **F+hall c01222** | 12% | 1.27 | 49% | **3.8** | 0.85x | 51% |
| F+hall c01233 | 12% | 1.30 | 54% | 6.8 | 0.84x | 45% |
| F+hall c01234 | 11% | 1.29 | 53% | 7.7 | 0.87x | 45% |
| F+hall c00112 | 13% | 1.27 | 49% | 4.9 | 1.02x | 50% |
| F+hub+port+ed+hall c01122 | 5% | 1.45 | 57% | 8.1 | 0.75x | 54% |
| **F+hub+port+ed+hall c01222** | 6% | 1.41 | 55% | **5.4** | 0.85x | 56% |
| F+hub+port+ed+hall c01233 | 5% | 1.41 | 60% | 8.8 | 0.63x | 61% |
| F+hub+port+ed+hall c01234 | 5% | 1.39 | 59% | 9.8 | 0.58x | 61% |
| F+hub+port+ed+hall c00112 | 5% | 1.38 | 58% | 7.1 | 1.07x | 60% |

F+hub+hall came out the same as F+hall to within a seat, since its Hubs went unplaced.

### Wins by turn position

| Rule set | 3 players | 4 players | 5 players |
|---|---|---|---|
| F (no catch-up) | 42 32 26 | 37 27 22 14 | 31 20 18 14 17 |
| F c01222 | 32 34 34 | 25 31 22 22 | 18 19 20 23 21 |
| F+hall c01222 | 31 35 35 | 19 32 22 28 | 18 21 22 20 20 |
| F+hall c01234 | 31 35 35 | 18 23 24 36 | 19 10 21 20 30 |
| F+hub+port+ed+hall c01222 | 32 34 35 | 19 26 32 24 | 18 16 28 19 20 |

An even share is 33%, 25% and 20%. At 3 players only the first two catch-up numbers count, so c01222, c01233 and c01234 play the same there.

### Findings

**The own-city Factory makes the game quieter and closer.** Only about 15 people arrive in a game, against about 35 in round 2, so about 25 are on the board at the end and about 30 cubes are still in the bag. Winners score about 80 points, not 100. Close finishes rise a little, to 14–15% without Ports.

**The first player's edge shrinks but doesn't go away.** Without catch-up cubes it's 1.3–1.4x, against 1.4–1.5x for round 2's quiet sets. Ports bring it back to 1.5–1.7x, since they still draw for every city.

**Catch-up cubes of 0, 1, 2, 2, 2 work best.** The second player gets 1 cube and everyone after them gets 2. In every base tested, that schedule is fairest or nearly so: seat bias 3.4 (F), 3.8 (F+hall) and 5.4 (everything). These are the fairest results of all three rounds. Giving each place one more cube than the last (c01233, c01234) favours the last seat at 4 and 5 players, especially with Town Halls. 0, 0, 1, 1, 2 is too little for the plain set.

**Good play pays less.** Without Ports, the bot beats three sloppy players only 40–55% of the time, against 64–70% in round 2 (25% would be no edge at all). With fewer people arriving, and all of them in one city, there are fewer seats to fight over. Ports put it back up to 55–69%.

**Hubs are still unplayed.** The Factory makes a joined pair of Hubs useful, but a single Hub still does nothing on its own, and the bot doesn't value what a Hub would do for later Factories. So, as in round 2, the data says little about Hubs. A human might use them more.

**Town Halls still do the most** for the game's shape: 6.7 elections, 1.3 lead changes and comebacks in half the games, in every combination.

### Everything together, with Hubs adding 2 cubes

Every tile at once (Hubs, Ports, eminent domain and Town Halls), with a Hub adding 2 of its placer's cubes to the bag instead of 0 ("F+all hub2c", to rerun: `hubcubes`). The 0-cube rows are the same sets from the tables above.

| Rule set | Hub cubes | Close finishes | Lead changes | Comebacks | Seat bias (pts) | First player's edge | Bot vs sloppy | Built over |
|---|---|---|---|---|---|---|---|---|
| no catch-up | 0 | 5% | 1.45 | 61% | 9.4 | 1.33x | 60% | 4.1 |
| no catch-up | 2 | 4% | 1.34 | 60% | 17.1 | 1.66x | 60% | 2.4 |
| c01122 | 0 | 5% | 1.45 | 57% | 8.1 | 0.75x | 54% | 4.1 |
| **c01122** | 2 | 6% | 1.28 | 59% | **3.4** | 0.92x | 59% | 2.5 |
| c01222 | 0 | 6% | 1.41 | 55% | 5.4 | 0.85x | 56% | 4.1 |
| c01222 | 2 | 3% | 1.23 | 54% | 7.5 | 0.86x | 57% | 2.5 |
| c00112 | 0 | 5% | 1.38 | 58% | 7.1 | 1.07x | 60% | 4.0 |
| c00112 | 2 | 5% | 1.23 | 55% | 7.1 | 1.12x | 67% | 2.4 |

Wins by turn position, with 2-cube Hubs and c01122: 36 34 31 at 3 players, 23 25 28 25 at 4, and 16 23 21 22 20 at 5.

- **Hubs get placed for their own sake now.** Every Hub was placed with 0 cubes as well, but mostly as the tile that eminent domain built over Residences with. With 2 cubes, building over falls from about 4 times a game to 2.4.
- **2-cube Hubs strengthen the first player** without catch-up cubes (1.66x, against 1.33x): the bag gets more cubes earlier, and the first player places first. So the right catch-up schedule changes. Here **0, 1, 1, 2, 2** is the fairest (seat bias 3.4, as fair as any set tested). 0, 1, 2, 2, 2 now overcorrects; the third seat wins 40% at 3 players.
- **Close finishes stay rare** (3–6%), as in every set with Ports, and lead changes fall a little (1.23–1.34, against 1.38–1.45).

### Without eminent domain

Eminent domain was removed from the rules after the runs above. These are the every-tile sets again, with Hubs, Ports and Town Halls only ("F+all" now means those three).

| Rule set | Hub cubes | Close finishes | Lead changes | Comebacks | Seat bias (pts) | First player's edge | Bot vs sloppy | Hubs placed |
|---|---|---|---|---|---|---|---|---|
| no catch-up | 0 | 6% | 1.46 | 63% | 13.9 | 1.51x | 65% | 0.0 |
| no catch-up | 2 | 9% | 1.31 | 63% | 12.0 | 1.44x | 66% | 4.0 |
| c01122 | 0 | 8% | 1.38 | 60% | 8.1 | 1.00x | 60% | 0.1 |
| c01122 | 2 | 6% | 1.24 | 52% | 6.8 | 1.11x | 72% | 4.0 |
| c01222 | 0 | 8% | 1.39 | 56% | 6.1 | 0.83x | 64% | 0.0 |
| **c01222** | 2 | **10%** | 1.25 | 55% | **6.6** | 0.85x | 60% | 4.0 |
| c00112 | 2 | 8% | 1.27 | 57% | 7.1 | 1.15x | 61% | 4.0 |

Wins by turn position, 2-cube Hubs:

| Catch-up | 3 players | 4 players | 5 players |
|---|---|---|---|
| none | 52 28 21 | 33 29 21 18 | 30 24 21 16 10 |
| c01122 | 40 36 24 | 25 31 21 24 | 23 22 17 23 15 |
| c01222 | 30 31 40 | 22 29 27 23 | 16 18 30 18 19 |

- **2-cube Hubs get played on their own merits**: every Hub is placed, against none at 0 cubes. With eminent domain gone, that's the clearest sign the cubes are what made them worth placing.
- **Close finishes are better than with eminent domain** (6–10%, against 3–6%), and the bot rewards good play about as much (60–72%).
- **It's less fair than with eminent domain**: the best seat bias is about 6–7 points, not 3.4. No schedule suits every player count. At 3 players, 0, 1, 1 leaves the first player ahead and 0, 1, 2 puts the third ahead. At 4 and 5 players, 0, 1, 2, 2, 2 is close to even apart from one seat. With 200 games per player count, a seat's win share is uncertain by about 3 points either way, so gaps under about 4 points of seat bias are within noise.

### How Town Halls get used

Measured in the every-tile set with 2-cube Hubs and 0, 1, 2, 2, 2 catch-up cubes, 200 games per player count (`npx vite-node scripts/simulate/townHalls.ts -- 200`).

| Players | Halls placed | Every player placed theirs | Points per Hall election (placer / others) | Share of all points | Average points per player |
|---|---|---|---|---|---|
| 3 | 82% | 53% of games | 2.0 / 0.0 | 3% | 61 |
| 4 | 70% | 18% of games | 2.1 / 0.1 | 3% | 54 |
| 5 | 59% | 2% of games | 2.1 / 0.2 | 3% | 50 |

- **The bots use a Town Hall as small, safe points for themselves.** Every one was placed where it joined no cities, about 40% of the way through the game, in a city with about 1 seat (usually a lone town's starting Residence) and about 2 Factories. That scores the placer about 2 points and nobody else anything.
- **Many never get placed**, more so with more players: games end after about 6 turns each, and a Hall is rarely a bot's best move until then.
- So the extra lead changes and comebacks Town Halls bring come from small elections early, when scores are low and 2 points can change who leads. Earlier rounds said Town Halls "do the most for the game's shape"; that holds for the measures, but the points involved are small.
- A person might use one differently: in a big city where they hold most of the seats, which would score far more but pay rivals too. The bot doesn't look for that.

### Recommendation (round 3)

**F+hall with 0, 1, 2, 2, 2 catch-up cubes** is the best of round 3 and the fairest set tested so far (seat bias 3.8). Compared with round 2's best ("P+hall quiet half"):
- it's fairer (3.8 against 5.5);
- close finishes are about the same (12% against 11%);
- it's a little less dynamic (1.27 lead changes against 1.49; comebacks in 49% of games against 54%);
- skill counts for less (the bot wins 51% against sloppy players, against 66%).

With every tile in (no eminent domain), Hubs adding 2 cubes and 0, 1, 2, 2, 2 catch-up cubes is the alternative: Hubs get played, there are more comebacks (55%) and more reward for good play (60% against sloppy players), and close finishes are almost as common (10%), but it's less fair (seat bias 6.6, against 3.8).

If rewarding good play matters more than fairness, round 2's every-city Factory is better. Adding Ports to round 3 gives some of that back, at the cost of close finishes.

Still untested: a Hub that does something alone, so it gets played; and the early end (about 6 turns each, with half the tiles unplaced).

---

## Round 2: place a tile, that's the turn

### What changed from round 1

- **No taking, no flipping.** A turn is placing one tile from your own supply. Every tile goes down face up and does at once what flipping it used to do. *(guessed:)* a Residence is a seat straight away and people level into it, a Factory scores straight away, and Universities are gone, since they came from flipping.
- **8 Residences each**, with 2 Factories and 1 School, plus 1 of each new tile in play.
- **A placed Factory draws a person for every city**, as a flipped one did. Without that, only Ports bring anyone: "P no draws" ends with just the 10 starting people on the board.
- **Eminent domain** can't build one Residence over another. In a first trial, bots did that about 27 times a game, which only moves people out and back in.
- Two things these results showed were needed, tested as extra options:
  - **Quiet arrivals**: people drawn from the bag no longer add the placer's cube to the bag, so the only cubes added are the placed tiles' own (rule 5 as written).
  - **Catch-up cubes**: later players start with extra cubes in the bag, by how many places after the first player they sit.

Ids: **P** is the round 2 base (rules 4 and 5, place-only, 8 Residences, Factories drawing). "+hub", "+port", "+ed" and "+hall" add Hubs, Ports, eminent domain and Town Halls. "P+all" has all four. "quiet" is quiet arrivals. "cu1" and "cu2" give 1 or 2 catch-up cubes per place; "flat" gives every player after the first 1; "half" gives 0, 1, 1, 2, 2.

### Results

| Rule set | Turns | Elections | Ends on last merger | Winner's points | Winning margin | Close finishes | Lead changes | Comebacks | Last election's share | Seat bias (pts) | First player's edge | Choices per turn | Bot vs sloppy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5.13 | 69 | 2.9 | 20% | 43 | 27% | 25% | 0.28 | 35% | 71% | 10 | 0.82x | 32 | 64% |
| P | 26 | 4.0 | 98% | 132 | 37% | 6% | 0.66 | 33% | 55% | 27 | 2.06x | 52 | 60% |
| P+hub | 26 | 4.0 | 100% | 134 | 37% | 6% | 0.66 | 33% | 55% | 27 | 2.07x | 76 | 68% |
| P+port | 28 | 4.0 | 100% | 128 | 44% | 4% | 0.54 | 36% | 60% | 25 | 2.01x | 60 | 62% |
| P+ed | 27 | 4.0 | 99% | 123 | 42% | 4% | 0.66 | 30% | 57% | 26 | 2.02x | 46 | 66% |
| P+hall | 27 | 6.8 | 100% | 128 | 36% | 6% | 1.49 | 49% | 53% | 25 | 2.01x | 64 | 67% |
| P+hub+port | 28 | 4.0 | 100% | 128 | 44% | 4% | 0.54 | 36% | 59% | 25 | 2.01x | 84 | 79% |
| P+hub+ed | 32 | 4.0 | 98% | 109 | 44% | 2% | 0.71 | 38% | 59% | 29 | 2.15x | 61 | 65% |
| P+hub+hall | 27 | 6.8 | 100% | 129 | 37% | 6% | 1.49 | 49% | 54% | 25 | 2.01x | 88 | 70% |
| P+port+ed | 29 | 4.0 | 100% | 120 | 48% | 1% | 0.56 | 37% | 61% | 24 | 1.96x | 55 | 58% |
| P+port+hall | 29 | 6.4 | 100% | 123 | 43% | 4% | 1.08 | 47% | 58% | 21 | 1.83x | 74 | 66% |
| P+ed+hall | 28 | 6.6 | 99% | 116 | 44% | 2% | 1.46 | 49% | 57% | 27 | 2.07x | 58 | 60% |
| P+hub+port+ed | 33 | 4.0 | 99% | 100 | 49% | 2% | 0.59 | 38% | 61% | 28 | 2.11x | 71 | 62% |
| P+hub+port+hall | 29 | 6.4 | 100% | 123 | 43% | 4% | 1.08 | 47% | 58% | 21 | 1.83x | 97 | 75% |
| P+hub+ed+hall | 32 | 6.7 | 99% | 103 | 46% | 3% | 1.44 | 47% | 56% | 32 | 2.27x | 74 | 70% |
| P+port+ed+hall | 30 | 6.2 | 100% | 112 | 50% | 2% | 1.00 | 48% | 60% | 22 | 1.86x | 70 | 62% |
| P+all | 32 | 6.3 | 99% | 94 | 50% | 2% | 1.04 | 46% | 57% | 25 | 1.99x | 88 | 64% |
| P no draws | 23 | 3.9 | 92% | 36 | 12% | 41% | 0.18 | 16% | 45% | 4 | 1.02x | 61 | 48% |
| P+all no draws | 33 | 6.4 | 97% | 81 | 46% | 4% | 1.06 | 46% | 54% | 35 | 2.40x | 84 | 56% |
| P quiet | 24 | 4.0 | 99% | 104 | 28% | 12% | 0.79 | 41% | 55% | 13 | 1.51x | 56 | 68% |
| P+hall quiet | 25 | 6.8 | 100% | 101 | 29% | 8% | 1.42 | 54% | 54% | 11 | 1.43x | 68 | 70% |
| P+port+hall quiet | 29 | 7.0 | 100% | 104 | 37% | 6% | 1.30 | 61% | 58% | 13 | 1.50x | 75 | 66% |
| P+all quiet | 29 | 7.1 | 100% | 91 | 38% | 6% | 1.39 | 61% | 55% | 13 | 1.50x | 98 | 66% |
| P+hall quiet cu1 | 26 | 6.7 | 99% | 105 | 32% | 7% | 1.48 | 51% | 56% | 9 | 0.72x | 66 | 64% |
| P+all quiet cu1 | 30 | 7.0 | 100% | 90 | 38% | 5% | 1.50 | 62% | 57% | 11 | 0.62x | 96 | 61% |
| P+hall quiet cu2 | 26 | 6.6 | 99% | 114 | 34% | 8% | 1.45 | 54% | 56% | 17 | 0.36x | 66 | 56% |
| P+all quiet cu2 | 30 | 6.9 | 100% | 91 | 42% | 4% | 1.46 | 59% | 56% | 21 | 0.24x | 94 | 54% |
| P+hall quiet flat | 25 | 6.7 | 99% | 103 | 30% | 9% | 1.38 | 54% | 55% | 8 | 0.92x | 67 | 63% |
| P+all quiet flat | 30 | 7.0 | 100% | 90 | 37% | 6% | 1.43 | 65% | 56% | 7 | 1.12x | 96 | 62% |
| **P+hall quiet half** | 26 | 6.8 | 99% | 103 | 30% | 11% | 1.49 | 54% | 57% | **6** | 0.99x | 66 | 66% |
| **P+all quiet half** | 29 | 7.1 | 100% | 90 | 37% | 6% | 1.48 | 65% | 55% | **7** | 0.90x | 97 | 57% |

"First player's edge" is the first player's win share divided by an even share: 1.00x is fair.

### Wins by turn position

| Rule set | 3 players | 4 players | 5 players |
|---|---|---|---|
| P | 64% / 26% / 10% | 46% / 34% / 15% / 6% | 49% / 24% / 17% / 7% / 4% |
| P+hall | 60% / 30% / 10% | 50% / 34% / 10% / 6% | 45% / 27% / 14% / 8% / 6% |
| P+all | 60% / 28% / 12% | 47% / 32% / 15% / 7% | 46% / 27% / 9% / 14% / 5% |
| P no draws | 36% / 33% / 30% | 23% / 29% / 23% / 25% | 21% / 24% / 19% / 18% / 18% |
| P quiet | 48% / 33% / 20% | 38% / 29% / 17% / 16% | 32% / 26% / 18% / 15% / 10% |
| P+hall quiet | 42% / 35% / 23% | 32% / 26% / 22% / 20% | 35% / 18% / 18% / 14% / 15% |
| P+all quiet | 47% / 28% / 25% | 34% / 31% / 18% / 16% | 34% / 22% / 22% / 12% / 11% |
| P+hall quiet cu1 | 38% / 32% / 30% | 14% / 23% / 30% / 34% | 10% / 13% / 20% / 26% / 30% |
| P+all quiet cu2 | 16% / 34% / 49% | 4% / 20% / 34% / 42% | 1% / 8% / 14% / 32% / 45% |
| P+hall quiet flat | 40% / 34% / 26% | 17% / 33% / 28% / 22% | 18% / 27% / 19% / 20% / 16% |
| P+all quiet flat | 37% / 36% / 28% | 26% / 32% / 25% / 16% | 24% / 28% / 18% / 16% / 14% |
| P+hall quiet half | 40% / 34% / 26% | 22% / 28% / 20% / 30% | 18% / 22% / 17% / 24% / 20% |
| P+all quiet half | 37% / 36% / 28% | 19% / 26% / 24% / 30% | 16% / 20% / 18% / 28% / 16% |

### What got played (per game)

| Rule set | Residences | Factories | Schools | Hubs | Ports | Town Halls | Built over | People on board at end | Bag at end |
|---|---|---|---|---|---|---|---|---|---|
| P | 16.5 | 8.0 | 1.0 | – | – | – | – | 49 | 48 |
| P+hub | 16.5 | 8.0 | 1.0 | 0.0 | – | – | – | 49 | 48 |
| P+hub+ed | 17.6 | 8.0 | 2.1 | 3.9 | – | – | 5.8 | 49 | 38 |
| P+hall | 15.0 | 8.0 | 0.8 | – | – | 2.8 | – | 49 | 47 |
| P+all | 12.3 | 8.0 | 1.6 | 3.5 | 4.0 | 2.5 | 5.1 | 67 | 46 |
| P quiet | 15.8 | 7.6 | 0.9 | – | – | – | – | 43 | 14 |
| P+all quiet | 11.2 | 7.6 | 0.9 | 2.6 | 4.0 | 3.1 | 2.0 | 55 | 6 |
| P+hall quiet half | 14.5 | 7.8 | 0.8 | – | – | 2.8 | – | 46 | 14 |
| P+all quiet half | 10.9 | 7.7 | 0.9 | 2.8 | 4.0 | 3.1 | 2.2 | 59 | 6 |

With 4 players there are 32 Residences in supplies; about 15 get placed.

### Findings

**Cities always merge, and early.** 97–100% of games end on the last merger, after 24–33 turns (6 or 7 each at 4 players), with about half the Residences still in supplies. So the map doesn't need tightening: the opposite. Face-up Factories score at once, which makes every merger worth taking, and a leader can end the game with the last one as soon as they're ahead. The 8 Residences each never run out.

**The first player wins far too often**: about twice an even share (45–65%) in every plain place-only set. It comes from the Factory draws. Each arrival added the placer's cube to the bag, so the first Factory fed its placer's later draws. Without draws, seats are even (seat bias 4), but nobody arrives and good play stops paying (48% against sloppy players).

**Quiet arrivals halve it.** Seat bias falls from 25–27 to 11–13 points, and games get closer (12% close finishes, against 6%). That's rule 5 taken literally: the placed tiles' cubes are the only ones added.

**Catch-up cubes finish the job if they're gentle.** One cube per place overcorrects at 4 and 5 players (the last seat becomes the favourite), and two per place much more so. **0, 1, 1, 2, 2** (one cube per two places, rounded up) gives the fairest games of any set, both rounds included: seat bias 6–7 points, first player's edge 0.9–1.0x.

**Town Halls still do the most for the game's shape**: 6.8 elections, about 1.5 lead changes and comebacks in half the games, in every combination.

**Hubs go unplaced in place-only games**, unless eminent domain is in, where they're mainly the tile bots build over Residences with. A first Hub only pays once someone places a second, and these games end after 6 or 7 turns each. That's partly the bot (I raised its value for a first Hub, and it still had better things to do), but it suggests Hubs need to do something on their own.

**Ports** add about 12–18 people and, with Town Halls, the most comebacks (61%). **Eminent domain** is used about twice a game (5 or 6 with Hubs), and widens margins slightly.

**Close finishes are rare in every place-only set** (2–12%, against 25% in 5.13). Winners score around 100 points, because face-up Factories multiply every seat from the moment they're placed.

### Recommendation (round 2)

**Place-only, rules 4 and 5, Town Halls, quiet arrivals and 0/1/1/2/2 catch-up cubes ("P+hall quiet half")** is the best of round 2:
- fair (seat bias 6, first player's edge 0.99x);
- dynamic (1.49 lead changes, comebacks in 54% of games);
- with the closest finishes of the fair sets (11%).

Adding Ports, Hubs and eminent domain ("P+all quiet half") makes for more comebacks (65%) and many more choices (97 a turn) at the cost of closeness (6%), and the Hubs in it barely get used.

Two things these rules still need, which I haven't tested:
- **The game ends too soon**, with half the tiles unplaced. Bigger distances between towns (a new map) would slow merging, or a rule that the last merger can't happen while anyone still has, say, more than 2 tiles.
- **Close finishes are rare.** Factories probably need to score less, for example with a cap on the points per seat in one election.

---

## Round 1: taking and flipping kept

### What was tested

The proposals, as the game reads them (calls marked *(guessed)* are mine; the rest is from the brief):

1. **Hub** *(new tile)*: placed face up. Every city with a Hub counts as one city for moving people: people level between Hub cities, and they pull, and are pulled, as one *(guessed: at the best School rank any of them has)*. Placing a Hub sets people moving, as a School does.
2. **Port** *(new tile)*: placed face up. It draws 1 person from the bag for every city, the way a flipped Factory does. *(guessed: each arrival still adds 1 of the placer's cubes to the bag, as Factory arrivals do.)*
3. **Eminent domain**: you may place any tile on a hex holding a placed Residence by taking 2 of your own cubes out of the bag; you can't without 2 there. *(guessed: never a starting Residence, so every city keeps one; the Residence is gone; its people move out, one at a time, into the city's least crowded Residence; nothing merges.)*
4. **Personal tiles**: each player starts with their own tiles and there's no shared supply, so the "take a tile" action is gone. *(guessed: 4 Residences, 2 Factories and 1 School each, plus 1 of each new tile in play.)*
5. **Cubes per tile**: a placed tile adds the placer's cubes to the bag: Residence 1, Factory 2, Hub 0, Port 3. This replaces the 5.13 promises (a Residence's cube per overcrowded Residence, a Factory's 2 Residence tiles). *(guessed: a School adds 0.)*

As asked, every proposed set includes 4 and 5, and adds every combination of 1, 2 and 3. Draft 5.13 as it is now is the reference.

I also tried one tile of my own, the **Town Hall**: placed face up, at most one to a city, and its city holds an election at once without merging (1 each, adding no cubes). The other tweaks each change one number: eminent domain costing 1 or 3, Ports adding 2 cubes, 2 Ports or 2 Hubs each, Schools adding 1 cube, and 3 Residences or 3 Factories each.

### How "interesting" was measured

The bots use heuristics, not search: they value each move by the board as it stands. They were taught the new tiles: a Hub is worth more once another city has one; a Port or Factory flip is worth the people the bag is likely to bring; eminent domain is worth the rival seat it removes, less its cost; a Town Hall is worth the election it would hold now. The measures:

- **Ends on last merger**: games that end with the merger leaving one city, a climax, not with everyone running out of things to do.
- **Close finishes**: shared wins, or wins by at most 10% of the winner's score. **Winning margin**: the winner's lead over second place, as a share of the winner's score.
- **Lead changes**: how often the sole leader changes from one election to the next. **Comebacks**: of games with a sole leader halfway through the elections, how often that leader loses.
- **Last election's share**: how much of the winner's score came from the final election. High means the earlier elections hardly matter.
- **Seat bias**: the largest gap, in percentage points, between any turn position's win share and an even share, averaged over the player counts.
- **Choices per turn**: legal actions on offer, a rough measure of how much there is to weigh.
- **Bot vs sloppy**: the bot's win share against three bots that play a random move half the time. 25% would mean good play earns nothing.

### Results

| Rule set | Turns | Elections | Ends on last merger | Winner's points | Winning margin | Close finishes | Lead changes | Comebacks | Last election's share | Seat bias (pts) | Choices per turn | Bot vs sloppy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5.13 | 69 | 2.9 | 20% | 43 | 27% | 25% | 0.28 | 35% | 71% | 10 | 32 | 64% |
| 4+5 | 52 | 2.5 | 18% | 27 | 35% | 29% | 0.09 | 11% | 64% | 15 | 37 | 61% |
| 4+5+ed | 52 | 2.4 | 17% | 23 | 34% | 31% | 0.09 | 12% | 65% | 17 | 41 | 68% |
| 4+5+port | 51 | 2.9 | 32% | 28 | 36% | 22% | 0.15 | 18% | 60% | 16 | 43 | 64% |
| 4+5+port+ed | 51 | 2.8 | 30% | 26 | 35% | 24% | 0.15 | 19% | 61% | 15 | 46 | 60% |
| 4+5+hub | 52 | 3.1 | 40% | 48 | 33% | 22% | 0.21 | 21% | 64% | 17 | 57 | 62% |
| 4+5+hub+ed | 50 | 2.9 | 36% | 30 | 36% | 23% | 0.12 | 15% | 57% | 18 | 64 | 70% |
| 4+5+hub+port | 50 | 3.3 | 52% | 43 | 33% | 19% | 0.26 | 27% | 59% | 16 | 63 | 64% |
| 4+5+hub+port+ed | 49 | 3.2 | 49% | 32 | 35% | 19% | 0.20 | 19% | 53% | 14 | 70 | 62% |
| 4+5+hall | 44 | 6.8 | 48% | 33 | 37% | 12% | 1.02 | 50% | 42% | 11 | 52 | 70% |
| hub+hall | 43 | 7.1 | 68% | 44 | 34% | 14% | 1.13 | 50% | 49% | 11 | 75 | 64% |
| port+hall | 44 | 6.8 | 58% | 31 | 35% | 13% | 0.93 | 47% | 41% | 13 | 58 | 60% |
| hub+port+hall | 43 | 7.0 | 74% | 40 | 32% | 16% | 1.03 | 51% | 48% | 13 | 80 | 60% |
| all+hall | 43 | 7.0 | 70% | 32 | 33% | 16% | 0.96 | 51% | 42% | 11 | 86 | 60% |
| hub+port+hall 3F | 40 | 7.2 | 88% | 49 | 34% | 14% | 1.16 | 52% | 53% | 12 | 91 | 66% |
| all ed=1 | 49 | 3.2 | 49% | 32 | 35% | 19% | 0.19 | 19% | 53% | 14 | 70 | 64% |
| all ed=3 | 49 | 3.2 | 49% | 32 | 35% | 19% | 0.20 | 19% | 53% | 14 | 70 | 66% |
| all port=2c | 49 | 3.2 | 46% | 31 | 35% | 20% | 0.18 | 20% | 54% | 14 | 69 | 65% |
| all 2 ports | 47 | 3.5 | 62% | 33 | 38% | 12% | 0.27 | 24% | 53% | 15 | 74 | 69% |
| all 2 hubs | 46 | 3.6 | 70% | 37 | 34% | 16% | 0.27 | 23% | 46% | 14 | 74 | 63% |
| all school=1c | 49 | 3.2 | 49% | 32 | 36% | 19% | 0.19 | 21% | 52% | 15 | 69 | 62% |
| all 3R | 47 | 3.0 | 36% | 28 | 34% | 22% | 0.19 | 21% | 57% | 15 | 66 | 65% |
| all 3F | 45 | 3.7 | 73% | 47 | 34% | 15% | 0.34 | 30% | 51% | 17 | 81 | 67% |

"all" is 4+5 with Hubs, Ports and eminent domain. Turns are counted across all players. With 200 games per player count, shares are good to about ±3 points and the bot-vs-sloppy column to about ±3.5.

### What got played (per game)

| Rule set | Residences | Factories | Schools | Hubs | Ports | Town Halls | Built over | Flips | People on board at end |
|---|---|---|---|---|---|---|---|---|---|
| 5.13 | 14.9 | 9.6 | 2.2 | – | – | – | – | 24.0 | 46 |
| 4+5 | 15.3 | 7.9 | 3.2 | – | – | – | – | 22.0 | 47 |
| 4+5+ed | 15.3 | 7.9 | 3.2 | – | – | – | 2.0 | 22.1 | 47 |
| 4+5+port | 14.5 | 7.7 | 2.9 | – | 4.0 | – | – | 18.6 | 63 |
| 4+5+hub | 15.2 | 7.8 | 3.2 | 2.6 | – | – | – | 20.8 | 46 |
| 4+5+hub+port | 14.4 | 7.6 | 2.8 | 2.0 | 4.0 | – | – | 17.0 | 63 |
| 4+5+hub+port+ed | 14.2 | 7.6 | 2.8 | 2.4 | 4.0 | – | 1.9 | 15.8 | 63 |
| hub+hall | 12.8 | 7.5 | 2.4 | 1.4 | – | 3.5 | – | 14.1 | 42 |
| hub+port+hall | 11.7 | 7.3 | 2.1 | 1.1 | 4.0 | 3.3 | – | 12.6 | 59 |
| all+hall | 11.5 | 7.3 | 2.2 | 1.5 | 4.0 | 3.3 | 1.5 | 11.9 | 59 |

With 4 players on average there are 4 of each one-per-player tile: Ports always get placed, Hubs about two times in three, and Town Halls nearly always.

### Wins by turn position

| Rule set | 3 players | 4 players | 5 players |
|---|---|---|---|
| 5.13 | 31% / 47% / 22% | 21% / 31% / 22% / 26% | 14% / 31% / 16% / 25% / 14% |
| 4+5 | 40% / 45% / 16% | 18% / 42% / 18% / 22% | 22% / 30% / 18% / 17% / 13% |
| 4+5+hub+port | 38% / 46% / 15% | 27% / 43% / 12% / 18% | 26% / 29% / 16% / 21% / 8% |
| 4+5+hub+port+ed | 39% / 44% / 17% | 24% / 40% / 16% / 19% | 23% / 30% / 16% / 21% / 9% |
| 4+5+hall | 34% / 46% / 20% | 27% / 32% / 24% / 17% | 18% / 32% / 19% / 14% / 18% |
| hub+hall | 36% / 45% / 20% | 27% / 34% / 22% / 17% | 18% / 32% / 19% / 13% / 18% |
| hub+port+hall | 45% / 35% / 20% | 34% / 30% / 18% / 18% | 25% / 36% / 20% / 10% / 8% |
| all+hall | 36% / 40% / 24% | 32% / 31% / 18% / 18% | 19% / 36% / 27% / 10% / 8% |

### Findings

**Personal tiles and cubes per tile (4 + 5)** make the game shorter (52 turns, not 69) and give more to weigh each turn, but on their own they make it flatter: fewer lead changes (0.09, not 0.28) and fewer comebacks (11%, not 35%). They work as a base, not as a fix.

**Hubs are the strongest of the three proposals.** Elections rise to 3.1, twice as many games end on the last merger (40%), and the winner scores far more (48), probably because Hubs let crowds spread into cities about to merge.

**Ports add people, not tension.** They put 16 more people on the board, and they help when paired with Hubs: Hubs plus Ports is the best of the proposed combinations, with 52% of games ending on the last merger, 0.26 lead changes and 27% comebacks. Adding 2 cubes per Port instead of 3 hardly matters.

**Eminent domain barely changes anything here.** Bots use it about twice a game. It lowers the winner's score and adds choices, but it leaves the game's shape alone, and the bot uses it exactly as often at a cost of 1 as at 3. Its value is probably in how people play (spite, defending a seat), which these bots can't show. I'd test it at the table rather than trust these numbers.

**The Town Hall changes the game the most.** Elections rise from about 3 to 7, lead changes from 0.2 to about 1, and the halfway leader loses half the time (51%, not 19–27%). The final election falls to under half of the winner's score, so the early game counts, and seat bias is the lowest of any proposed set (11). The cost: fewer close finishes (12–16%, against 19–29% without it), since more elections spread scores apart, and somewhat shorter games.

**The second player wins most often, in every set, 5.13 included** (about 45% at 3 players, 31–43% at 4). No proposal fixes it. It may be the bots (the first player has least to work with), but it's worth watching at the table, and the next thing I'd test is a compensation such as one extra cube in the bag for later players.

### Recommendation (round 1)

**Personal tiles and cubes per tile, plus Hubs and a Town Hall each ("hub+hall")** gives the most interesting games. It has the most lead changes (1.13), comebacks in half the games, a climax in 68% of games, the earlier elections mattering (49% from the last one), and the lowest seat bias (11). If you'd rather not add a tile of mine, **4 + 5 with Hubs and Ports** is the best of your proposals, and eminent domain can sit on top of either until it's been tested with people.

## Caveats (all rounds)

- Every bot plays the same heuristic, so this shows how the rules behave under one sensible style of play, not under people. A rule the bot misjudges (eminent domain especially) can look weaker or stronger than it is.
- "Interesting" is measured by stand-ins: lead changes, comebacks, climactic endings, close finishes and fairness. Different weightings would rank the sets differently; the tables let you choose.
- The guessed details above (tile counts, how Hubs rank, where displaced people go) are mine. Each is a single setting, so another reading is a short rerun.
