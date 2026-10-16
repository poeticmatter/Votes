import { IllegalMoveError } from 'game-kit/turns'
import { districtOf } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addToBag } from './bag'
import { cityOf, hasRoom, residencesInCity, stations } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, PlayerColor, VotesState } from './types'

// Housing, every turn: people waiting at Stations move into Residences with space in
// the Station's city, as many as fit. The active player picks who moves where, one
// person at a time; a move that is the only one possible happens by itself. People
// who don't fit keep waiting, and move in on a later turn once there's space.
//
// A Residence's owner adds 1 cube to the bag for each person housed from another
// player's Station.

/** Residences in the Station's city with space for one more. */
export function homesWithRoomFor(state: VotesState, station: HexKey): HexKey[] {
  return residencesInCity(state, cityOf(state, districtOf(station)))
    .filter(({ tile }) => hasRoom(tile))
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

/** The Residence owner who earns a cube for this move, if anyone does. */
export function housingPayee(state: VotesState, { from, to }: PersonMove): PlayerColor | null {
  const station = state.tiles[from]
  const residence = state.tiles[to]
  if (station?.kind !== 'station' || residence?.kind !== 'residence') return null
  return residence.owner && residence.owner !== station.owner ? residence.owner : null
}

export function house(state: VotesState, move: PersonMove): VotesState {
  if (!housingMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't house a ${move.color} person from ${move.from} in ${move.to}`)
  }
  const paid = housingPayee(state, move)
  const moved = movePerson(state, move)
  const logged: VotesState = {
    ...moved,
    log: [...moved.log, { kind: 'housed', turn: state.turn.number, color: move.color, from: move.from, to: move.to, paid }],
  }
  return paid ? addToBag(logged, paid, 1) : logged
}

/** Makes housing moves for as long as only one is possible. */
export function houseWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = housingMoves(current); moves.length === 1; moves = housingMoves(current)) {
    current = house(current, moves[0])
  }
  return current
}
