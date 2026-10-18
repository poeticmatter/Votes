import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addVotes } from './bag'
import { activePlayerState, cityOf, hasRoom, residencesInCity, stations } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// Housing, every turn: people waiting at Stations move into Residences with space in
// the Station's city, as many as fit. The active player picks who moves where, one
// person at a time; a move that is the only one possible happens by itself. People
// who don't fit keep waiting, and move in on a later turn once there's space.
//
// Votes: the active player adds 1 of their cubes to the bag for each person housed.

/** Residences in the Station's city with space for one more. */
export function homesWithRoomFor(state: VotesState, station: HexKey): HexKey[] {
  const tile = state.tiles[station]
  if (tile?.kind !== 'station') throw new Error(`Expected a Station at ${station}`)
  return residencesInCity(state, cityOf(state, tile.town))
    .filter(({ tile: residence }) => hasRoom(residence))
    .map(({ key }) => key)
}

export function housingMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'housing') return []
  return stations(state).flatMap(({ key }) => movesFrom(state, key, homesWithRoomFor(state, key)))
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
  return addVotes(
    { ...moved, log: [...moved.log, { kind: 'housed', turn: state.turn.number, ...move, voter }] },
    1,
  )
}

/** Makes housing moves for as long as only one is possible. */
export function houseWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = housingMoves(current); moves.length === 1; moves = housingMoves(current)) {
    current = house(current, moves[0])
  }
  return current
}
