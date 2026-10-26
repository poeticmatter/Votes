# Solo playtest: always the same colour

The solo playtest lets one person playtest a multiplayer game alone. The tester plays several games at once and always plays the same colour, whichever seat and game they are dealt. This page explains how the colours are swapped, so another game can do the same.

In GameKit it is the lobby's **Solo Playtest** play mode, `'solo_playtest'` in code (both the `PlayMode` and the `Seating` a board gets). Everything below is what that mode does in turn-based games.

## Why

Playing every seat yourself goes wrong in a predictable way: you know what each colour is planning, because you were that colour last turn and will be again next turn. The solo playtest breaks that up.

- The tester runs several **tables**: separate games with the same settings and player count, each with its own seed.
- When a turn is over, the tester presses **End turn** and is dealt the seat whose turn it is at a random unfinished table, sometimes the same table again. Until then, **Undo** takes back the turn's moves.
- The dealt seat is always drawn in the first player colour. In Votes that is Orchid, so the tester is Orchid every single turn.
- The other seats get the other colours in a random order, drawn again on every deal.

So every turn reads like a real player's: you sit down as Orchid, look at the board, and play the best move you can see. You can't tell which seat or table you really hold, and you can't follow a rival's plan from turn to turn, because the colours point at different seats every deal.

## The swap: looks, not seats

The game state never changes. Seat *i* is still `PLAYER_COLORS[i]` in the state, the rules, the moves, the saved game and the scores. Only the drawing changes.

The platform gives the board a function `lookOf(seat)`: the seat whose **look** (colour, piece art, colour name) to draw that seat with. On every deal it works the looks out afresh (GameKit's `disguiseSeats` in `src/core/seatDisguise.ts`):

1. The dealt seat gets look 0, the first seat's.
2. The other seats get looks 1 to *n*−1, shuffled by the playtest's seeded random generator.

Online play, and a table that has just finished, use `lookOf(seat) = seat`, so a finished table shows who really was who.

A three-player Votes playtest (seat 0 Orchid, seat 1 Vermillion, seat 2 Cobalt) might deal like this:

| Deal | Table | Seat dealt | Seat 0 drawn as | Seat 1 drawn as | Seat 2 drawn as |
|---|---|---|---|---|---|
| 1 | A | 1 | Cobalt | **Orchid** | Vermillion |
| 2 | B | 2 | Vermillion | Cobalt | **Orchid** |
| 3 | A | 2 | Cobalt | Vermillion | **Orchid** |

At deal 3 the tester is back at table A as Orchid, but now holds seat 2. The pieces they placed as Orchid at deal 1 belong to seat 1, which is now drawn in Vermillion: to the tester, that is a rival's work.

A rotation, `lookOf(seat) = (seat − dealt + n) mod n`, would also keep the tester on look 0 and is simpler. It keeps the other colours in table order, though: the colour after yours would always be the seat after yours. GameKit shuffles them so that no colour stands for any particular seat.

## Who does what

**The platform** (GameKit, `src/turns/playtest/`) runs the playtest and owns the looks:

- `session.ts`: the tables, dealing a random open seat (`dealAnyTable`), and ending a turn (`endSoloTurn`), which deals the next one straight away with new looks, or shows a finished table with its real seats.
- `useSoloPlaytest.ts`: turns the session into board props. `lookOf` reads the deal's looks; `players` is named after each seat's look (`playerAppearance(look).name`), so names don't give seats away either; `role` is the dealt seat.
- `SoloPlaytestMatch.tsx`: renders the game's board with `seating="solo_playtest"` and `lookOf`, keyed by the deal count so nothing selected carries over to another seat or table.
- `storage.ts`: saves the playtest, looks included, so a reload carries on with the same colours.

**The board** (each game) has to draw through `lookOf`. In Votes that all goes through `src/game/ui/viewer.tsx`:

- `usePieceColorOf()` turns a colour in the state into the palette entry to draw it with: `PIECE_COLORS[PLAYER_COLORS[lookOf(seat)]]`. Nothing else reads `PIECE_COLORS` by a state colour.
- `useByLook()` sorts colours by how they look, so a list's order never reveals a seat.
- `names.tsx` names players and colours by their look, and never says "You" when `seating` is `'solo_playtest'`; the turn banner says "Orchid to play" instead of "Your turn".
- `PlayersPanel.tsx` lists players in turn order starting from the viewer, not in seat order.
- Grey cubes belong to no seat, so they are never swapped.
- The rules sheet's examples name their colours in the captions, so `RulesSheet.tsx` draws them with `lookOf(seat) = seat`.

## Checklist for another game's board

1. **Draw every seat colour through `lookOf`**: pieces, swatches, outlines, highlights, score markers. Put the lookup in one helper, as Votes does, so a search for the palette finds a single use.
2. **Name through the look.** Colour names come from the look; player names come from `players`, which the platform already names after the look. Drop "you" wording when `seating === 'solo_playtest'`.
3. **Don't list anything in seat order.** A scoreboard in seat order that shows Orchid third tells the tester they hold seat 2. List from the viewer's seat, or sort by look.
4. **Keep the state in real seats.** Moves the board submits name real seats and colours, never looks. Only what is drawn on screen changes.
5. **Leave seatless colours alone** (Votes' grey) and **leave fixed illustrations alone** (rules examples whose text names a colour).
6. **Test it.** Render the board with a `lookOf` that swaps two seats and check the real colour never appears (Votes: "draws a disguised seat only in the colour it looks like" in `Board.test.tsx`).

## Without GameKit

A game on another platform needs the platform half too:

- Keep each table's game state in real seats, and the current deal's `looks: number[]` beside it, outside the game state.
- When a turn ends, pick a random (table, seat to play) among unfinished tables, compute the looks, and pass `lookOf` to the board.
- When a table finishes, reset the looks to `seat => seat` to show the real seats.
- Save the tables, the looks and the random generator's state together, so a reload resumes the same deal.

The disguise itself is short:

```ts
const PLAYED_SEAT_LOOK = 0

function disguiseSeats(seatCount: number, playedSeat: number, randomState: number) {
  const seats = Array.from({ length: seatCount }, (_, seat) => seat)
  const { items: otherLooks, nextState } = shuffled(seats.filter(look => look !== PLAYED_SEAT_LOOK), randomState)
  const looks = new Array<number>(seatCount)
  looks[playedSeat] = PLAYED_SEAT_LOOK
  seats.filter(seat => seat !== playedSeat).forEach((seat, index) => {
    looks[seat] = otherLooks[index]
  })
  return { looks, nextState }
}
```

`shuffled` is any seeded shuffle that returns the generator's next state; a seeded one keeps a saved playtest reproducible.
