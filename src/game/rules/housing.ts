import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addVote } from './bag'
import { activePlayerState, hasRoom, residences, stations } from './boardQueries'
import { isSameMove, isWithinCity, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// Housing, every turn: people waiting at Stations move into Residences with space in
// the same city, as many as fit. The active player picks who moves where, one person at
// a time; a move that is the only one possible happens by itself. People who don't fit
// keep waiting, and move in on a later turn once there's space.
//
// Votes: the active player adds 1 of their cubes to the bag for each person who moves in.

/** Residences in the city of the Station at `station` with space for one more. */
function homesFor(state: VotesState, station: HexKey): HexKey[] {
  return residences(state)
    .filter(({ key, tile }) => hasRoom(tile) && isWithinCity(state, station, key))
    .map(({ key }) => key)
}

export function housingMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'housing') return []
  return stations(state).flatMap(({ key }) => movesFrom(state, key, homesFor(state, key)))
}

export function isHousingOver(state: VotesState): boolean {
  return housingMoves(state).length === 0
}

export function beginHousing(state: VotesState): VotesState {
  return { ...state, phase: { kind: 'housing' } }
}

export function house(state: VotesState, move: PersonMove): VotesState {
  if (!housingMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't house a ${move.color} person from ${move.from} in ${move.to}`)
  }
  const moved = movePerson(state, move)
  const voter = activePlayerState(state).color
  const entry = { kind: 'housed' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to, voter }
  return addVote({ ...moved, log: [...moved.log, entry] })
}

/** Makes housing moves for as long as only one is possible. */
export function houseWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = housingMoves(current); moves.length === 1; moves = housingMoves(current)) {
    current = house(current, moves[0])
  }
  return current
}
