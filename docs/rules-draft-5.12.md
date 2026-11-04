# Votes (temp name) — Rules (Draft 5.12)

> *[Tagline TBD]*

**Votes** (temp name) is a 3–5 player game of development and vote manipulation.

*Numbers in [brackets] are playtest dials.*

*This draft lives in the game repo while it is tested. Once it's settled it replaces `Rules/Votes.md` in the asset repo, which still holds Draft 5.11; the game's 5.11 is tagged `draft-5.11`.*

## Components
- Hex map with mountains and 5 town sites, each with a starting Residence.
- **Tiles:** [15] Residences, [10] Factories, [5] Mines and [5] Schools. Tiles belong to nobody.
- Cubes in each player's color (people), plus [10] grey cubes (independents).
- One bag.

## Setup
1. Take 2 cubes of each player's color, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.
2. Put the remaining grey cubes and [2] more cubes of each player's color in the bag.
3. Choose a first player.

## Cities
A **city** is a group of connected tiles. Each city starts as a single town: its starting Residence.

## Core Concepts
Cubes are people. After every tile you place, people arrive and move, one person at a time, until nobody can move.

**Immigration:** a Factory or Mine draws [3] people from the bag, one at a time. Each moves into the least crowded Residence in its city, checked again after each one. Ties: you choose. If the bag is empty, nobody arrives.

**Levelling:** within a city, a person may move from a Residence to another Residence in the same city only if the destination has at least 2 fewer people.

**School pull:** a city with a School pulls people from cities **without** a School, never from another School city. A person moves from a Residence outside into a Residence in the School city if the source has more people than the destination (a difference of 1 is enough).

**Order:** the most crowded source moves first, into the least crowded destination. Ties, and which person (cube) moves, are your choice. Keep going until no legal move remains.

**Votes:** for each person who moves or arrives on your turn, including immigration, add 1 of your cubes to the bag.

## Your Turn
1. **Place** a tile on an empty hex touching a tile. Only Mines may be placed on mountains.
2. **Immigration**, if the tile is a Factory or Mine.
3. **Movement:** levelling and School pulls until nobody can move.
4. **Merger:** if the tile touches two or more cities, they become one city. Hold an **election**.

### 🏠 Residence
1 seat, with no limit on people. People sit in a row: newcomers join on the right, and when someone leaves, the rest slide left.

When a Residence is built, people level into it: most crowded source first, until no legal move remains.

### 🏭 Factory
**Immigration:** [3] people from the bag.

**Value** at elections: 1, +1 if it touches a Mine.

### ⛏️ Mine
**Immigration:** [3] people from the bag.

Mines are placed only on mountains.

**Value** at elections: 2.

### 🏫 School
Its city pulls people from cities with no School (see School pull).

You may not place a School in a city that already has one.

## Elections
Only the newly merged city votes, once everyone has moved.

1. **Each Residence is a seat.** The color with the most cubes on it wins the seat. **Ties go to the tied color furthest left.** An empty seat belongs to nobody.
2. **Payout:** add up the value of the city's Factories and Mines. Find the points per seat on the table, using the city's total number of seats. Each player scores that many points for each seat they hold. A city with no Factories or Mines pays nothing.

| City value | 2–3 seats | 4–6 | 7–10 | 11+ |
|---|---|---|---|---|
| 1–4 | 1 | 1 | 1 | 1 |
| 5–9 | 2 | 2 | 1 | 1 |
| 10–16 | 4 | 3 | 2 | 1 |
| 17–24 | 5 | 3 | 3 | 2 |
| 25+ | 6 | 4 | 3 | 2 |

## Game End
The game ends after the **4th election**, when the last two cities merge. Most points wins. Tiebreak: most cubes on the board.

---

## Playtest Notes
- **Changes from 5.11:**
  1. No rail and no Stations. Factories lose the rail bonus.
  2. Immigration goes straight into Residences: each person into the least crowded one in the city.
  3. Housing is replaced by levelling (within a city, to a Residence with at least 2 fewer) and School pulls (from cities without a School, to a Residence with fewer).
  4. Every person who arrives or moves gives a vote, immigration included.
  5. Residences have no capacity.
- **No overcrowding threshold, on purpose.** Watch for new Residences draining small districts, and School pulls emptying rival cities. Add a threshold only if needed.
- **Bag volume:** every arrival now adds a cube, so the bag refills as fast as it's drawn. In seeded test games the bag never ran out, and ended with 40–75 cubes.
- **Ties are frequent:** least-crowded arrivals and levelling tie often, about 60–75 choices a game in seeded tests. Watch whether that's interesting or a chore.
- **Merged Schools:** two cities that each have a School can merge into a city with two. That's harmless: the second one just adds nothing.
- **Base:** 5.10 is built on 5.7, not 5.8. 5.8 cut four sources of bag volume at once (grey out of the bag, no votes for imports, no School adjacency votes, Housing from elsewhere) and starved the economy.
- **Changes from 5.7:**
  1. Ties go to the leftmost tied color (was: grey).
  2. Schools reworked (see Changes from 5.11).
  3. Seat split payout: every seat scores (was: most seats scores the Factories).
  4. Mines on mountains, worth a flat 2. Factories are worth 1, +1 if they touch a Mine.
  5. No town colors: place a tile touching any tile, and touching two cities merges them. Watch whether mergers come too early or too cheap.
- **Payout table:** an approximation of value ÷ seats, rounded up. It matches exact division 80% of the time and is off by 0.2 points per seat on average. It assumes about 3 industry tiles per 4 seats. That figure predates flat-2 Mines and the filled cells below.
- **Filled cells:** lots of value in few seats (17+ in 2–3 seats, 25+ in 4–6) were blank. They're filled one step past their neighbors, below exact division, so a small city stacked with industry isn't a jackpot. They should rarely come up.
- **Residences dilute:** each new seat can drop a city into a cheaper column. Watch whether Residences now feel aggressive, not like a setup for the next player.
- **Grey seats** count toward the city's seats but score for nobody.
- A tile touching three cities merges them all in one election. Allow it, or limit merges to two cities at a time?

### Interpretations chosen in the app (revisit)
- **Mines** bring people the same way as Factories. The 5.12 brief only names Factories, but Mines arrived at Stations, which are gone.
- **One pool of moves:** levelling and School pulls run together after every placement, with most-crowded-first across both.
- **The printed Factory** beside E's old Station now stands on that hex, beside E's starting Residence.
- **Game end:** the tiles often run out before the 4th election; the game then ends once a full round of players has passed.

### Parked for later
- 2-player rules
- Trickle arrivals (timing puzzle)
- Mine-specific arrivals
- Clockwise rail
- Temperance upgrades (reformed tiles)
- Money: town funds, campaigning, credit for good things happening
