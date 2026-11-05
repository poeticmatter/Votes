# Votes (temp name) — Rules (Draft 5.13)

> *[Tagline TBD]*

**Votes** (temp name) is a 3–5 player game of development and vote manipulation.

*Numbers in [brackets] are playtest dials. Items marked (guessed) are calls the app made where the brief left a question open; see the end.*

*This draft lives in the game repo while it is tested. Once it's settled it replaces `Rules/Votes.md` in the asset repo, which still holds Draft 5.11. The game's earlier drafts are tagged `draft-5.11` and `draft-5.12`, and `docs/rules-draft-5.12.md` keeps 5.12's text.*

## Components
- Hex map with mountains and 5 town sites, each with a starting Residence. Nothing is placed on mountains.
- **Tiles:** [15] Residences, [10] Factories and [5] Schools, in a shared supply.
- Cubes in each player's color (people), plus [10] grey cubes (independents). Grey people live in Residences and move like anyone else, but never vote.
- One bag.

## Setup
1. Take 2 cubes of each player's color, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.
2. Put the remaining grey cubes and [2] more cubes of each player's color in the bag.
3. Each player takes 2 Residence tiles from the shared supply into their own supply.
4. Choose a first player.

## Terms
- A **city** is a group of connected tiles, face down or face up. Each city starts as a single town: its starting Residence.
- A Residence with **4+ people** is **overcrowded**.
- Residences have no capacity.

## Your Turn
Take **one** action:
1. **Take a tile:** a Factory or a School from the shared supply into your own supply. (guessed: not Residences)
2. **Place a tile** from your supply on an empty hex touching a tile. Residences and Factories are placed **face down** (a promise). Schools are placed face up.
3. **Flip** any face-down tile, anyone's.

Then:
- **Movement**, if you flipped a tile or placed a School (see Migration).
- **Merger:** if the tile you placed touches two or more cities, they become one city. Hold an **election**.

## Tiles

### 🏠 Residence
- **Place (face down):** add 1 of your cubes to the bag for each overcrowded Residence in that city. Not a seat yet.
- **Flip:** becomes a seat. People move in by levelling.

People sit in a row: newcomers join on the right, and when someone leaves, the rest slide left.

### 🏭 Factory
- **Place (face down):** take 2 Residence tiles into your supply (as many as the shared supply has left).
- **Flip:** draw 1 person from the bag for **each** city on the board. Each goes into that city's least crowded Residence (ties: you choose). Each person who arrives adds 1 of your cubes to the bag. If the bag is empty, nobody else arrives.

Every city holds its towns' starting Residences, face up from the start, so a city always has a face-up Residence for its person.

### 🏫 School
- **Place (face up):** its city pulls people from cities without a School (see Migration). You may not place a School in a city that already has one.
- **Flip into a University:** only in a city with two Schools (only possible through a merger). A University city also pulls from cities that have a School but no University.

## Migration
Resolve movement only after a flip or a School placement, until nothing can move. (Nothing else changes where people want to be.) One person moves at a time, between face-up Residences:

- **Levelling:** a person may move from a Residence to another Residence in the same city only if the destination has at least 2 fewer people.
- **School pull:** a city with a School pulls people from cities without a School, never from another School city. A person moves from a Residence outside into a Residence in the School city if the source has more people than the destination (a difference of 1 is enough). A University city also pulls from cities that have a School but no University.
- **Order:** newcomers settle in their own city first: nobody is pulled while anyone can level. Schools work only on people already living in Residences. Within each, the most crowded source moves first, into the least crowded destination. Ties, and which person (cube) moves: you choose.

Moving adds nothing to the bag.

## Elections
Only the newly merged city votes.

1. **Each face-up Residence is a seat.** Grey people don't vote: the player color with the most cubes on it wins the seat. **Ties go to the tied player color furthest left.** A seat where nobody votes, empty or all grey, belongs to nobody.
2. **Payout:** each seat scores its holder 1 point per face-up Factory in the city. Grey and empty seats score for nobody. Face-down Factories count for nothing.

## Game End
The game ends after the **4th election**, when the last two cities merge. Most points wins. Tiebreak: most cubes on the board.

---

## Playtest Notes
- **Changes from 5.12:**
  1. Mines are gone, and so is the payout table.
  2. Moving no longer adds cubes to the bag.
  3. A turn is one action: take, place or flip. Players have their own supply of tiles, starting with 2 Residences.
  4. Residences and Factories are placed face down as promises, and only score or hold people once someone flips them.
  5. A Factory flip brings 1 person per city, not 3 to its own.
  6. Schools can become Universities.
  7. Movement happens only after a flip or a School placement, and levelling comes before School pulls.
  8. Scoring is seats × face-up Factories.
- **Scoring is now seats × Factories.** New seats no longer dilute payouts, so watch whether late elections make early ones irrelevant.
- **Factory flips feed every city,** so they matter less as cities merge; late Factories are mostly about points. Thematically weak, kept for testing ("regional boom").
- **Early Residence promises may be worth 0** if no Residence is overcrowded yet. Watch the opening. In seeded test games this was most of the game, not just the opening: levelling kept Residences at 3 or fewer, and 15 face-down Residences a game earned 0–1 cubes in all.
- **Watch whether Factory flips stall:** they bring people from a bag full of the promisers' colors. In seeded tests the bag stayed at its starting size (12–20 cubes): each arrival draws one cube and adds one, and nothing else feeds it now that moves and empty promises add nothing.
- **Game end:** in seeded tests about 1 game in 4 reached the 4th election; the rest ended when nobody could act (supplies empty, nothing left face down).
- **Merged Schools:** two cities that each have a School can merge into a city with two. That's now the only way to make a University.
- **Seats nobody holds**, empty or all grey, score for nobody.
- A tile touching three cities merges them all in one election. Allow it, or limit merges to two cities at a time?

### Calls the app made (revisit)
- **Take a tile:** only Factories and Schools can be taken. Residences come only from setup and from placing Factories. (The brief asked: any type, or only Factories and Schools.)
- **A city with no face-up Residence** can't happen: every city holds its towns' starting Residences, which are face up from the start. So a Factory's person never waits. (The brief asked: wait on the Factory, or back to the bag.)
- **Arrivals still vote:** each person a flipped Factory brings adds 1 of the flipper's cubes to the bag, as in 5.12. The brief removed votes only for moving.
- **Face-down tiles join cities:** a face-down tile is a tile, so it connects and merges cities, and its placement holds the election at once. Nobody moves after a face-down placement, since only flips and Schools move people.
- **Newcomers first:** levelling always comes before School pulls, after every flip and School placement, not just after a Factory flip.
- **Flipping a School:** a School in a city with two or more Schools (Universities included) can be flipped, even if the city already has a University; a second University adds nothing.
- **University ranks:** a city with a University pulls from cities with a School but no University, and from cities with no School; it's never pulled from.
- **Shared supply limits:** starting Residences come out of the [15]; with 5 players that leaves 5 for Factories to give out.
- **The printed Factory** beside E starts face up and scores like any face-up Factory.
- **Game end:** the game also ends once a full round of players has passed (nobody can take, place or flip).

### Parked for later
- 2-player rules
- Trickle arrivals (timing puzzle)
- Clockwise rail
- Temperance upgrades (reformed tiles)
- Money: town funds, campaigning, credit for good things happening
