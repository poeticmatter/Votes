# Votes design log

What changed and why, newest first. **Game design** is the game itself: rules, content (map, tiles, numbers) and balance. **Game development** is everything else: the board and UI, the platform, bots, tooling and fixes that don't change the rules. A change that does both has an entry in each. Entries before 2026-11-15 were written afterwards from the git history, so they give a reason only where the commits recorded one.

## Game design

### 2026-11-05: Rules Draft 5.13: one action a turn, face-down promises, Universities
- A turn is one action: take a Factory or School from the shared supply, place a tile from your own supply, or flip any face-down tile. Players start with 2 Residence tiles of their own.
- Residences and Factories are placed face down as promises. A face-down Residence adds a cube to the bag per overcrowded (4+) Residence in its city; a face-down Factory gives its placer 2 Residence tiles.
- Flipped, a Residence becomes a seat, and a Factory draws 1 person per city into that city's least crowded Residence.
- A School flipped in a city with two Schools becomes a University, which also pulls from School cities that have none.
- Movement runs only after a flip or a School placement, levelling before pulls, and adds nothing to the bag.
- Each seat scores 1 point per face-up Factory. Mines and the payout table are gone.
- Calls the game makes where the draft is open: only Factories and Schools can be taken; arrivals still add a cube to the bag; face-down tiles join and merge cities; a full round of passes ends the game.

### 2026-11-05: Grey people never vote
A seat goes to the player colour with the most people there, and a tie to the tied player colour furthest left, skipping grey. A Residence that is empty or all grey is a seat nobody holds. Grey people still arrive and move like anyone else.

### 2026-11-04: Rules Draft 5.12: no rail or Stations; arrivals, levelling and School pulls
- The rail, Stations and the Factory rail bonus are gone.
- A Factory or Mine draws its people one at a time, each into the least crowded Residence of its city.
- After every placement people move until nobody can: levelling within a city into a Residence with at least 2 fewer, and School pulls from cities without a School. The most crowded source goes first, into the least crowded destination. Every arrival and move adds a vote.
- Residences have no capacity.
- The printed Factory moves to E's old Station hex, beside E's Residence.

### 2026-10-28: A new map, cut to 7 rows
The asset generator's new map, with its bottom 2 rows cut: 11 by 7 hexes. Towns A and E and the printed Factory move, with new mountains, and the rail now runs off the south edge beside A and E.

### 2026-10-28: Rules Draft 5.11: Schools widen housing instead of moving people
Relocation is gone. A city with a School can also house people waiting at any Station, or living in a city with no School, and a School can't be placed touching a city that already has one. Housing is mandatory, so a School city with room pulls people in by itself. A School city's own people never move between its Residences.

### 2026-10-26: Schools fill every Residence they touch
A School owes 1 person to each adjacent Residence that touches no other School, moved one at a time in the order the player chooses, and stops early when nobody is left to take. Each person adds a vote.

### 2026-10-26: Schools take from anywhere touching no School
A School's person comes from any Station, or any Residence that touches no School, in any city. Residences beside the rail are no longer off limits.

### 2026-10-26: Rules Draft 5.10: Mines, a tile supply, a payout table; a redrawn map
- 3 to 5 players. A shared supply of 15 Residences, 10 Factories, 5 Mines and 5 Schools; a kind that runs out can't be placed.
- The game also ends once every player has passed in a row.
- Mines go only on mountains, bring 3 people and are worth 2. Factories are worth 1, +1 beside the rail, +1 touching a Mine.
- 10 grey cubes; those not seeded on the starting Residences go in the bag, with 2 cubes of each player's colour.
- Housing only within the same city: neighbouring cities are gone. Every person moved into a Residence adds a vote.
- Schools take from any Residence that touches no School and isn't beside the rail.
- Each seat pays from a table, by the city's value and its number of seats.
- The asset generator's redrawn map, with a printed Factory beside E's Station.

### 2026-10-19: Draft 5.8 revision: neighbouring cities, ties go left
Cities are neighbours when any of their Stations are one stop apart by rail, and people move within their city or from a neighbouring one, for housing and School relocation alike. A person from within the city adds a cube to the bag; one from a neighbour adds none. People sit in a row, newcomers on the right, and a tied seat goes to the tied colour furthest left.

### 2026-10-19: Rules Draft 5.8: connected cities, rail stops, one-person Schools
- Town colours are gone. Tiles go on any empty hex touching a tile or Station.
- A city is a group of connected tiles and Stations, and a tile touching two or more cities joins them.
- Housing can pull from Stations in the Residence's city or one stop away along the rail; the first person from each such Station in a turn earns no cube.
- A Factory's people arrive at one Station of its city, the player's choice.
- A School relocates one person into one adjacent Residence that touches no other School.
- A tied seat counts for nobody. Grey cubes exist only at setup, and each player bags 4 cubes.

### 2026-10-18: Mountains only, one rail through every town
Lakes, the river and forests are gone; the forests became mountains, the only terrain left. The two rail lines became one, snaking past every town's Station.

### 2026-10-18: Rules Draft 5.7: towns, printed Stations, votes for housing
- Towns replace districts. The five starting Residences (2 Sand, 2 Sage, 1 Slate) are shuffled onto the town sites at setup, each with its Station beside it.
- Tiles belong to nobody. A tile goes next to one of its colour and may not connect two towns of that colour.
- Factories bring 3 people to their town's Station. The active player adds a cube to the bag per person housed or relocated, and Schools add one per neighbouring Residence touching no other School.
- Seat ties go to grey.

### 2026-10-16: Rules Draft 5.4: station sites take only Stations
A station site in use at the player count takes a Station and nothing else; sites not in use are ordinary hexes.

### 2026-10-16: Rules Draft 5.3: relocation, immigration, housing; a seat per Residence
- Six forest hexes along the southern rail, and ten printed station sites (two more from 4 players, two more at 5).
- Stations go only on a station site in use. The Factory–School adjacency ban and jobs are gone.
- A turn is placement, a School's relocation (1 person from anywhere into each Residence beside it), immigration (people drawn onto Stations, the owner paying a cube per person), housing (waiting people move into Residences with space in their city), then any merger.
- Only the newly merged city votes. Every Residence is a seat: most people wins, ties go to the owner, or to grey on a printed Residence.

### 2026-10-15: Schools give the vote instead of cubes
Placing a School no longer adds cubes to the bag. Only families in a Residence next to a School vote, across a district line included. Every Residence still adds a seat, so seats can go unfilled.

### 2026-10-15: Forests
Three lake hexes became forests: nothing can be built there, and they border districts like mountains and lakes.

### 2026-10-15: Immigration fills every home and job at once
Families arrive right after the tile is placed, through any Station as often as needed, until no Station can bring one. The first family into a district pays each Station owner there 1 cube; each family still pays its Residence's owner.

### 2026-10-15: Printed Factories, and families on the printed Residences
Setup prints two Factories in district E and deals 2 families onto each printed Residence: 2 cubes of each player's colour, topped up with grey to 10, shuffled. The bag starts with 2 of each player's colour (was 3) plus the grey cubes left over.

### 2026-10-15: The first playable rules
The map, districts and look ported from the asset generator, with rules for placement, the School bonus, immigration from a seeded bag, mergers, elections and the game's end. The bracketed values in the rules became lobby settings.

## Game development

### 2026-11-15: A plain-language rules document and this log
`docs/rules.md` describes the game as it plays now, and this log records changes in two parts. Both are kept up to date with every change.

### 2026-11-15: Heuristic bots, on GameKit 0.8.0
GameKit 0.8.0 lets the lobby seat bots in async and live games. The Votes bot values every legal move by the board as it stands (seats won or lost, the election a merger would hold now, what the bag holds) and plays the best. It doesn't search ahead, by request, and so never sees a draw before it happens. In seeded games it beat three random players every time; in all-bot games the second player wins noticeably more often than the others.

### 2026-11-05: The board follows Draft 5.13
New turn choices, and their own look for face-down tiles and Universities. The rules sheet is rewritten, with promise, flip and School examples. The draft lives in `docs/rules-draft-5.13.md` with a player aid; the asset repo stays on 5.11 until the designer signs it off.

### 2026-11-04: The board follows Draft 5.12
The board, panels, log and rules sheet follow 5.12, with arrival, levelling and School pull examples played out through the rules themselves. Draft 5.11 is tagged `draft-5.11`, and `docs/rules-draft-5.12.md` holds the new draft.

### 2026-10-26: The board follows Draft 5.10; GameKit 0.6.0
A Mine tile, Residences without empty home slots, a tile picker showing the tiles left, city values and scores in the cities panel, and the supply panel showing tiles and grey cubes. The rules sheet is rewritten with the payout table. Rules tests find their hexes through `testMap.ts`, so a new map doesn't break them. GameKit 0.6.0 renames hot seat to the solo playtest, explained in `docs/solo-playtest.md`.

### 2026-10-20: Bigger icons in the tile picker
The tile buttons were too narrow for an icon and a label side by side, so "Residence" ran into its icon. Each button now shows a larger icon with its name underneath.

### 2026-10-19: Undo and End turn in every play mode
GameKit 0.5.0 gives async and live play the same Undo and End turn as hot seat. A move that draws cubes from the bag can't be undone, since the player would have seen what came out; GameKit warns before it.

### 2026-10-19: A clearer log
The recent events log says where each person went, how many cubes went into the bag, and why. Housing and relocation entries had been blank; fixed and covered by tests.

### 2026-10-16: Games saved by another version no longer crash
An async room created by a browser still on the pre-5.3 deploy saved the old state, and other players' boards went blank reading it. Every state now records its rules version, and a board shows a "different version" message for any other.

### 2026-10-16: A Rules button with the full rules sheet
The asset generator's rules sheet, ported as real text and SVG so it can be searched: components, setup, the turn, tiles, elections and six worked examples, drawn with the game's own map and pieces. Tests check the examples against the rules.

### 2026-10-16: The board follows Draft 5.3
Stations show who is waiting, full Residences show overflow, and a picker moves one person at a time for relocation and housing.

### 2026-10-15: New colours for homes and Residences; Orchid plays first seat
Empty homes are white, printed Residences pale sage with no outline. Seat 0 plays pink, and colours are named Orchid, Vermillion, Cobalt, Saffron and Jade.

### 2026-10-15: Empty homes drawn as dashed outlines
A filled slot read as a cube of the tile's colour, or as grey on a printed Residence.

### 2026-10-15: GameKit 0.2 to 0.4: the hot-seat playtest
Hot seat became a playtest: one tester is dealt random seats across several tables, with the played seat disguised as seat 0. The board draws every colour through the viewer's look, lists players from the viewer's seat, and reports winners and scores for the summary. Later releases added a Quit control, and Undo and End turn.

### 2026-10-15: The platform moves into GameKit
The take-turns multiplayer platform built for Votes moved into GameKit, which Votes now depends on by release tag. GameKit's default theme is the Metro look, so Votes only sets its font.

### 2026-10-15: A 3–5 player, take-turns platform
The template's two-player simultaneous plans were replaced with players taking turns in order: seats for 2 to 5 players with names, a join screen, and taking a seat back on another device. Async rooms store the players and claim seats through a database function; live and hot seat play use the same rules. Tests cover the rules, seeded full games and the board.

### 2026-10-14: Started from the game template
